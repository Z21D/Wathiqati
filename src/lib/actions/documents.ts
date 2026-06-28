"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/format";
import { documentSchema } from "@/lib/validations/document";

export type DocumentActionState = {
  error?: string;
  success?: boolean;
};

async function requireOrgId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await getOrganizationForUser(session.user.id);
  if (!membership) throw new Error("No organization found");

  return membership.organizationId;
}

async function upsertCompany(organizationId: string, companyName: string) {
  const name = normalizeText(companyName);

  return prisma.company.upsert({
    where: {
      organizationId_name: {
        organizationId,
        name,
      },
    },
    create: { organizationId, name },
    update: {},
  });
}

export async function upsertDocumentRecord(input: {
  organizationId: string;
  companyName: string;
  documentType: string;
  referenceId: string;
  expiresAt: Date;
  employeeName?: string | null;
  description?: string | null;
}) {
  const company = await upsertCompany(input.organizationId, input.companyName);
  const documentType = normalizeText(input.documentType);
  const referenceId = normalizeText(input.referenceId);

  return prisma.document.upsert({
    where: {
      companyId_documentType_referenceId: {
        companyId: company.id,
        documentType,
        referenceId,
      },
    },
    create: {
      organizationId: input.organizationId,
      companyId: company.id,
      documentType,
      referenceId,
      expiresAt: input.expiresAt,
      employeeName: input.employeeName
        ? normalizeText(input.employeeName)
        : null,
      description: input.description ?? null,
    },
    update: {
      expiresAt: input.expiresAt,
      employeeName: input.employeeName
        ? normalizeText(input.employeeName)
        : undefined,
      description: input.description ?? null,
    },
    include: { company: true },
  });
}

export async function createDocumentAction(
  _prev: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  try {
    const organizationId = await requireOrgId();

    const parsed = documentSchema.safeParse({
      companyName: formData.get("companyName"),
      employeeName: formData.get("employeeName") || undefined,
      documentType: formData.get("documentType"),
      referenceId: formData.get("referenceId"),
      description: formData.get("description") || undefined,
      expiresAt: formData.get("expiresAt"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const {
      companyName,
      employeeName,
      documentType,
      referenceId,
      description,
      expiresAt,
    } = parsed.data;

    await upsertDocumentRecord({
      organizationId,
      companyName,
      employeeName,
      documentType,
      referenceId,
      expiresAt: new Date(expiresAt),
      description,
    });

    revalidateDocumentPaths();
    return { success: true };
  } catch {
    return { error: "Failed to save document. Please try again." };
  }
}

export async function deleteDocumentAction(
  documentId: string
): Promise<DocumentActionState> {
  try {
    const organizationId = await requireOrgId();

    await prisma.document.deleteMany({
      where: { id: documentId, organizationId },
    });

    revalidateDocumentPaths();
    return { success: true };
  } catch {
    return { error: "Failed to delete document." };
  }
}

export async function updateDocumentAction(
  documentId: string,
  formData: FormData
): Promise<DocumentActionState> {
  try {
    const organizationId = await requireOrgId();

    const existingDocument = await prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!existingDocument) {
      return { error: "Document not found." };
    }

    const parsed = documentSchema.safeParse({
      companyName: formData.get("companyName"),
      employeeName: formData.get("employeeName") || undefined,
      documentType: formData.get("documentType"),
      referenceId: formData.get("referenceId"),
      description: formData.get("description") || undefined,
      expiresAt: formData.get("expiresAt"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const {
      companyName,
      employeeName,
      documentType,
      referenceId,
      description,
      expiresAt,
    } = parsed.data;

    const company = await upsertCompany(organizationId, companyName);
    const normalizedDocumentType = normalizeText(documentType);
    const normalizedReferenceId = normalizeText(referenceId);

    const conflictingDocument = await prisma.document.findUnique({
      where: {
        companyId_documentType_referenceId: {
          companyId: company.id,
          documentType: normalizedDocumentType,
          referenceId: normalizedReferenceId,
        },
      },
    });

    if (conflictingDocument && conflictingDocument.id !== documentId) {
      return {
        error:
          "Another document already uses this company, document name, and number.",
      };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        companyId: company.id,
        employeeName: employeeName ? normalizeText(employeeName) : null,
        documentType: normalizedDocumentType,
        referenceId: normalizedReferenceId,
        expiresAt: new Date(expiresAt),
        description: description || null,
      },
    });

    revalidateDocumentPaths();
    return { success: true };
  } catch {
    return { error: "Failed to update document. Please try again." };
  }
}

function revalidateDocumentPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/reminders");
  revalidatePath("/dashboard/permits");
}
