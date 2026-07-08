import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { DangerZone } from "@/components/settings/danger-zone";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await auth();
  const membership = await getOrganizationForUser(session!.user.id);
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      email: true,
      companyName: true,
      notificationEmail: true,
      emailRemindersEnabled: true,
      reminderSchedule: true,
      expiredReminderFrequency: true,
      healthyReportFrequency: true,
    },
  });

  const accountEmail = user?.email ?? session?.user.email ?? "";
  const productionRecipient = user?.notificationEmail || accountEmail;
  const canAccessEmailCenter =
    membership?.role === "OWNER" || membership?.role === "ADMIN";

  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Account details and workspace preferences"
        userName={session?.user.name}
      />
      <div className="grid gap-6 p-4 sm:p-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <SettingRow label="Name" value={session?.user.name ?? "—"} />
            <SettingRow label="Login email" value={accountEmail || "—"} />
            <SettingRow label="Role" value={session?.user.role ?? "USER"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <SettingRow label="Organization" value={membership?.organization.name ?? "—"} />
            <SettingRow label="Alert rules" value="Expired · Urgent ≤ 7 days · Expiring soon ≤ 30 days" />
            <SettingRow label="Production recipient" value={productionRecipient || "—"} />
            <SettingRow label="Email reminders" value={user?.emailRemindersEnabled ? "Enabled" : "Disabled"} />
            <SettingRow
              label="Expired reminders"
              value={
                user?.expiredReminderFrequency === "daily"
                  ? "Daily until resolved"
                  : "Send once"
              }
            />
            <SettingRow
              label="Healthy-status reports"
              value={
                user?.healthyReportFrequency === "daily" ? "Daily" : "Weekly"
              }
            />
          </CardContent>
        </Card>

        {canAccessEmailCenter && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Email Center</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-secondary">
                Monitor delivery, send test emails, run reminder simulations, and review email history.
              </p>
              <ButtonLink href="/dashboard/settings/email" variant="secondary">
                Open Email Center
              </ButtonLink>
            </CardContent>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Notification preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationSettingsForm
              companyName={user?.companyName}
              accountEmail={accountEmail}
              notificationEmail={user?.notificationEmail}
              emailRemindersEnabled={user?.emailRemindersEnabled ?? true}
              reminderSchedule={user?.reminderSchedule ?? "30,14,7,3,1,expired"}
              expiredReminderFrequency={user?.expiredReminderFrequency ?? "once"}
              healthyReportFrequency={user?.healthyReportFrequency ?? "weekly"}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DangerZone />
        </div>
      </div>
    </>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-subtle px-4 py-3 ring-1 ring-[#f2f2f7]">
      <p className="text-xs uppercase tracking-wide text-ink-tertiary">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}
