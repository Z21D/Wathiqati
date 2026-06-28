import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";
import { getDocumentsForOrganization } from "@/lib/documents";
import { DashboardHeader } from "@/components/dashboard/header";
import { DocumentForm } from "@/components/documents/document-form";
import { DocumentTable } from "@/components/documents/document-table";
import { ExcelImport } from "@/components/documents/excel-import";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Documents",
};

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-2xl bg-[#f2f2f7]" />
      ))}
    </div>
  );
}

export default async function DocumentsPage() {
  const session = await auth();
  const membership = await getOrganizationForUser(session!.user.id);

  const documents = membership
    ? await getDocumentsForOrganization(membership.organizationId)
    : [];

  return (
    <>
      <DashboardHeader
        title="Documents"
        description="Manage company documents, expiry dates, and Excel imports"
        userName={session?.user.name}
      />
      <div className="space-y-8 p-4 sm:p-8">
        <div className="grid gap-8 xl:grid-cols-2">
          <DocumentForm />
          <div id="import">
            <ExcelImport />
          </div>
        </div>
        <Card id="all-documents">
          <CardHeader>
            <CardTitle>All documents ({documents.length})</CardTitle>
            <p className="text-sm text-ink-secondary">
              Status is calculated automatically from expiry dates.
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<TableSkeleton />}>
              <DocumentTable documents={documents} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
