import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { logImport } from "@/lib/documents";
import { parseExcelBuffer } from "@/lib/excel/parser";

type DuplicatePreview = {
  companyName: string;
  documentType: string;
  referenceId: string;
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getOrganizationForUser(session.user.id);
    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      return NextResponse.json(
        { error: "Please upload an Excel file (.xlsx or .xls)" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseExcelBuffer(buffer);

    if (parsed.errors.length > 0 && parsed.rows.length === 0) {
      return NextResponse.json(
        { error: parsed.errors[0], details: parsed.errors },
        { status: 400 }
      );
    }

    if (formData.get("mode") === "preview") {
      const duplicates = await findExistingDocuments({
        organizationId: membership.organizationId,
        rows: parsed.rows,
      });

      return NextResponse.json({
        success: true,
        mode: "preview",
        totalRows: parsed.rows.length,
        newRows: parsed.rows.length - duplicates.length,
        duplicates: duplicates.length,
        skipped: parsed.skipped,
        warnings: parsed.errors,
        duplicateSamples: duplicates.slice(0, 5),
      });
    }

    const importMode = formData.get("mode") === "new-only" ? "new-only" : "import";
    const uniqueCompanyNames = [...new Set(parsed.rows.map((row) => row.companyName))];

    if (uniqueCompanyNames.length > 0) {
      await prisma.company.createMany({
        data: uniqueCompanyNames.map((name) => ({
          organizationId: membership.organizationId,
          name,
        })),
        skipDuplicates: true,
      });
    }

    const companies = await prisma.company.findMany({
      where: {
        organizationId: membership.organizationId,
        name: { in: uniqueCompanyNames },
      },
      select: { id: true, name: true },
    });
    const companyIdByName = new Map(
      companies.map((company) => [company.name, company.id])
    );
    const existingSet = await findExistingDocumentKeySet({
      organizationId: membership.organizationId,
      rows: parsed.rows,
      companyIdByName,
    });

    const newRows = parsed.rows.filter((row) => {
      const companyId = companyIdByName.get(row.companyName);
      return companyId && !existingSet.has(documentKey(companyId, row));
    });
    const rowsToUpdate =
      importMode === "import"
        ? parsed.rows.filter((row) => {
            const companyId = companyIdByName.get(row.companyName);
            return companyId && existingSet.has(documentKey(companyId, row));
          })
        : [];

    if (newRows.length > 0) {
      await prisma.document.createMany({
        data: newRows.map((row) => ({
          organizationId: membership.organizationId,
          companyId: companyIdByName.get(row.companyName)!,
          documentType: row.documentType,
          referenceId: row.referenceId,
          expiresAt: row.expiresAt,
          employeeName: row.employeeName ?? null,
          description: null,
        })),
        skipDuplicates: true,
      });
    }

    await Promise.all(
      rowsToUpdate.map((row) =>
        prisma.document.update({
          where: {
            companyId_documentType_referenceId: {
              companyId: companyIdByName.get(row.companyName)!,
              documentType: row.documentType,
              referenceId: row.referenceId,
            },
          },
          data: {
            expiresAt: row.expiresAt,
            employeeName: row.employeeName ?? undefined,
          },
        })
      )
    );

    const created = newRows.length;
    const updated = rowsToUpdate.length;
    const rowsToImport = created + updated;

    const skippedDuplicates = parsed.rows.length - rowsToImport;
    const totalSkipped = parsed.skipped + skippedDuplicates;

    revalidatePath("/dashboard");
    revalidatePath("/home");
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/reminders");

    await logImport({
      organizationId: membership.organizationId,
      fileName: file.name,
      imported: rowsToImport,
      created,
      updated,
      skipped: totalSkipped,
    });

    return NextResponse.json({
      success: true,
      imported: rowsToImport,
      created,
      updated,
      skipped: totalSkipped,
      skippedDuplicates,
      warnings: parsed.errors,
    });
  } catch (error) {
    console.error("Excel import error:", error);
    return NextResponse.json(
      { error: "Failed to import Excel file. Please try again." },
      { status: 500 }
    );
  }
}

async function findExistingDocuments({
  organizationId,
  rows,
}: {
  organizationId: string;
  rows: {
    companyName: string;
    documentType: string;
    referenceId: string;
  }[];
}): Promise<DuplicatePreview[]> {
  if (rows.length === 0) return [];

  const companies = await prisma.company.findMany({
    where: {
      organizationId,
      name: { in: [...new Set(rows.map((row) => row.companyName))] },
    },
    select: { id: true, name: true },
  });

  const companyIdByName = new Map(
    companies.map((company) => [company.name, company.id])
  );
  const existingSet = await findExistingDocumentKeySet({
    organizationId,
    rows,
    companyIdByName,
  });

  return rows.filter((row) => {
    const companyId = companyIdByName.get(row.companyName);
    if (!companyId) return false;
    return existingSet.has(documentKey(companyId, row));
  });
}

async function findExistingDocumentKeySet({
  organizationId,
  rows,
  companyIdByName,
}: {
  organizationId: string;
  rows: {
    companyName: string;
    documentType: string;
    referenceId: string;
  }[];
  companyIdByName: Map<string, string>;
}) {
  const existingKeys = rows
    .map((row) => {
      const companyId = companyIdByName.get(row.companyName);
      if (!companyId) return null;

      return {
        companyId,
        documentType: row.documentType,
        referenceId: row.referenceId,
      };
    })
    .filter((key): key is NonNullable<typeof key> => key !== null);

  if (existingKeys.length === 0) return new Set<string>();

  const existingDocuments = await prisma.document.findMany({
    where: {
      organizationId,
      OR: existingKeys,
    },
    select: {
      documentType: true,
      referenceId: true,
      company: { select: { id: true, name: true } },
    },
  });

  return new Set(
    existingDocuments.map(
      (document) =>
        `${document.company.id}::${document.documentType}::${document.referenceId}`
    )
  );
}

function documentKey(
  companyId: string,
  row: { documentType: string; referenceId: string }
) {
  return `${companyId}::${row.documentType}::${row.referenceId}`;
}
