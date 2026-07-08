import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmailHealthReport } from "@/lib/email/health";
import type { EmailLog } from "@prisma/client";

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "yellow" | "red" | "neutral";
}) {
  const classes =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "yellow"
        ? "bg-amber-50 text-amber-800 ring-amber-100"
        : tone === "red"
          ? "bg-red-50 text-red-700 ring-red-100"
          : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes}`}>
      {label}
    </span>
  );
}

function formatLogTime(log?: EmailLog | null) {
  if (!log) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(log.createdAt);
}

export function EmailCenterDashboard({
  provider,
  senderEmail,
  notificationEmail,
  providerStatus,
  timezone,
  reminderSchedule,
  healthyReportFrequency,
  queueStatus,
  stats,
  health,
}: {
  provider: string;
  senderEmail: string;
  notificationEmail: string;
  providerStatus: "connected" | "disconnected" | "configuration_error";
  timezone: string;
  reminderSchedule: string;
  healthyReportFrequency: string;
  queueStatus: string;
  stats: {
    lastSuccess: EmailLog | null;
    lastFailed: EmailLog | null;
    lastWelcome: EmailLog | null;
    lastPasswordReset: EmailLog | null;
    lastDigest: EmailLog | null;
    lastHealthy: EmailLog | null;
    lastExpiry: EmailLog | null;
    lastVerification: EmailLog | null;
    lastTest: EmailLog | null;
    totalSent: number;
    totalFailed: number;
  };
  health: EmailHealthReport;
}) {
  const providerTone =
    providerStatus === "connected"
      ? "green"
      : providerStatus === "configuration_error"
        ? "red"
        : "yellow";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Email system status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Row label="Current provider" value={provider.toUpperCase()} />
          <Row label="Sender email" value={senderEmail} />
          <Row label="Notification email" value={notificationEmail} />
          <div className="flex items-center justify-between rounded-2xl bg-surface-subtle px-4 py-3 ring-1 ring-[#f2f2f7]">
            <span className="text-xs uppercase tracking-wide text-ink-tertiary">
              Provider status
            </span>
            <StatusBadge
              label={
                providerStatus === "connected"
                  ? "Connected"
                  : providerStatus === "configuration_error"
                    ? "Configuration error"
                    : "Disconnected"
              }
              tone={providerTone}
            />
          </div>
          <Row label="Daily reminder schedule" value={reminderSchedule} />
          <Row
            label="Healthy report frequency"
            value={healthyReportFrequency === "daily" ? "Daily" : "Weekly"}
          />
          <Row label="Current time zone" value={timezone} />
          <Row label="Email queue status" value={queueStatus} />
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Total sent" value={stats.totalSent} tone="green" />
            <Metric label="Total failed" value={stats.totalFailed} tone="red" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent email activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ActivityRow label="Last successful email" value={formatLogTime(stats.lastSuccess)} />
          <ActivityRow label="Last failed email" value={formatLogTime(stats.lastFailed)} />
          <ActivityRow label="Last welcome email" value={formatLogTime(stats.lastWelcome)} />
          <ActivityRow label="Last password reset" value={formatLogTime(stats.lastPasswordReset)} />
          <ActivityRow label="Last daily digest" value={formatLogTime(stats.lastDigest)} />
          <ActivityRow label="Last healthy report" value={formatLogTime(stats.lastHealthy)} />
          <ActivityRow label="Last expiry reminder" value={formatLogTime(stats.lastExpiry)} />
          <ActivityRow label="Last verification email" value={formatLogTime(stats.lastVerification)} />
          <ActivityRow label="Last test email" value={formatLogTime(stats.lastTest)} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Email health check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {health.issues.length === 0 ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Email system looks healthy. Provider, notification email, and cron checks passed.
            </div>
          ) : (
            health.issues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
                  issue.severity === "error"
                    ? "bg-red-50 text-red-800 ring-red-100"
                    : issue.severity === "warning"
                      ? "bg-amber-50 text-amber-900 ring-amber-100"
                      : "bg-slate-50 text-slate-700 ring-slate-200"
                }`}
              >
                <p className="font-semibold">{issue.title}</p>
                <p className="mt-1">{issue.recommendation}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-subtle px-4 py-3 ring-1 ring-[#f2f2f7]">
      <p className="text-xs uppercase tracking-wide text-ink-tertiary">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}

function ActivityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-subtle px-4 py-3 ring-1 ring-[#f2f2f7]">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red";
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 ring-1 ${
        tone === "green"
          ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
          : "bg-red-50 text-red-800 ring-red-100"
      }`}
    >
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
