import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";
import { getAlertsForUser } from "@/lib/documents";
import { DashboardHeader } from "@/components/dashboard/header";
import { AlertsCenter } from "@/components/dashboard/alerts-center";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Alerts",
};

export default async function RemindersPage() {
  const session = await auth();
  const membership = await getOrganizationForUser(session!.user.id);

  const alerts = membership
    ? await getAlertsForUser({
        organizationId: membership.organizationId,
        userId: session!.user.id,
      })
    : [];

  return (
    <>
      <DashboardHeader
        title="Expiry alerts"
        description="Expired, urgent (7 days), and expiring soon (30 days) documents"
        userName={session?.user.name}
      />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/dashboard/documents" variant="secondary">
            Add document
          </ButtonLink>
          <ButtonLink href="/dashboard/documents#import" variant="outline">
            Import Excel
          </ButtonLink>
          <ButtonLink href="/dashboard" variant="ghost">
            Back to overview
          </ButtonLink>
        </div>
        <AlertsCenter alerts={alerts} />
      </div>
    </>
  );
}
