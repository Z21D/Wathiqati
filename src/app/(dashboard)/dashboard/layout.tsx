import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";
import { buildDocumentAlerts, getDocumentsForOrganization } from "@/lib/documents";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const membership = await getOrganizationForUser(session.user.id);
  const organizationName = membership?.organization.name ?? "My Workspace";

  const documents = membership
    ? await getDocumentsForOrganization(membership.organizationId)
    : [];

  const alertCount = buildDocumentAlerts(documents).length;

  return (
    <div className="min-h-screen bg-surface-muted lg:flex">
      <DashboardSidebar organizationName={organizationName} alertCount={alertCount} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
