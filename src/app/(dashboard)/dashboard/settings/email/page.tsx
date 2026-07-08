import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmailCenterDashboard } from "@/components/email-center/email-center-dashboard";
import { EmailCenterTools } from "@/components/email-center/email-center-tools";
import { EmailCenterSettingsForm } from "@/components/email-center/email-center-settings-form";
import { EmailHistoryTable } from "@/components/email-center/email-history-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import {
  getEmailDashboardStats,
  getEmailLogsForOrganization,
} from "@/lib/email/email-log";
import {
  getEmailHealthReport,
  getProviderDisplayInfo,
} from "@/lib/email/health";
import { requireEmailCenterAccess } from "@/lib/auth/email-center";

export const metadata: Metadata = {
  title: "Email Center",
};

export default async function EmailCenterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getOrganizationForUser(session.user.id);
  if (
    !membership ||
    (membership.role !== "OWNER" && membership.role !== "ADMIN")
  ) {
    redirect("/dashboard/settings");
  }

  let context;
  try {
    context = await requireEmailCenterAccess();
  } catch {
    redirect("/dashboard/settings");
  }

  const providerInfo = getProviderDisplayInfo();
  const [stats, logs, health] = await Promise.all([
    getEmailDashboardStats(context.organizationId),
    getEmailLogsForOrganization(context.organizationId, 100),
    getEmailHealthReport({
      notificationEmail: context.user.notificationEmail,
      accountEmail: context.user.email,
    }),
  ]);

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return (
    <>
      <DashboardHeader
        title="Email Center"
        description="Monitor, test, and manage Wathiqati email delivery"
        userName={session.user.name}
      />

      <div className="space-y-6 p-4 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink-secondary">
              Workspace: {context.organizationName}
            </p>
            <p className="text-xs text-ink-tertiary">
              Owner/Admin tools only. Secrets are never shown here.
            </p>
          </div>
          <ButtonLink href="/dashboard/settings" variant="outline">
            Back to Settings
          </ButtonLink>
        </div>

        <EmailCenterDashboard
          provider={providerInfo.provider}
          senderEmail={providerInfo.senderEmail}
          notificationEmail={context.notificationEmail}
          providerStatus={health.providerStatus}
          timezone={timezone}
          reminderSchedule={context.user.reminderSchedule}
          healthyReportFrequency={context.user.healthyReportFrequency}
          queueStatus={stats.queueStatus}
          stats={stats}
          health={health}
        />

        <Card>
          <CardHeader>
            <CardTitle>Owner tools</CardTitle>
          </CardHeader>
          <CardContent>
            <EmailCenterTools />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlySetting
                label="Email provider"
                value={providerInfo.provider.toUpperCase()}
                hint="Configured via EMAIL_PROVIDER in Vercel environment variables."
              />
              <ReadOnlySetting
                label="Sender address"
                value={providerInfo.fromHeader}
                hint="Comes from GMAIL_USER or RESEND_FROM_EMAIL."
              />
            </div>
            <EmailCenterSettingsForm
              accountEmail={context.user.email}
              notificationEmail={context.user.notificationEmail}
              emailRemindersEnabled={context.user.emailRemindersEnabled}
              reminderSchedule={context.user.reminderSchedule}
              expiredReminderFrequency={context.user.expiredReminderFrequency}
              healthyReportFrequency={context.user.healthyReportFrequency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email history</CardTitle>
          </CardHeader>
          <CardContent>
            <EmailHistoryTable logs={logs} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ReadOnlySetting({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-subtle px-4 py-3 ring-1 ring-[#f2f2f7]">
      <p className="text-xs uppercase tracking-wide text-ink-tertiary">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-secondary">{hint}</p>
    </div>
  );
}
