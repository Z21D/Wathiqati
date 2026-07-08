import { prisma } from "@/lib/prisma";
import {
  APP_NAME,
  getEmailProviderConfigurationError,
  getFromEmail,
  sendEmail,
} from "@/lib/email/client";
import {
  buildDocumentAlerts,
  getDashboardCounts,
  type DocumentAlert,
  type DocumentWithCompany,
} from "@/lib/documents";
import {
  dashboardUrl,
  documentListSection,
  emailLayout,
  highlightCard,
  statRow,
} from "@/lib/email/templates";
import { formatDate } from "@/lib/format";

export const DIGEST_DOCUMENT_SENTINEL = "__digest__";

export type HealthyReportFrequency = "daily" | "weekly";

export type OrganizationDigest = {
  counts: ReturnType<typeof getDashboardCounts>;
  expired: DocumentAlert[];
  urgent: DocumentAlert[];
  expiringSoon: DocumentAlert[];
  mostUrgent: DocumentAlert | null;
  hasIssues: boolean;
};

export function buildOrganizationDigest(
  documents: DocumentWithCompany[],
  now: Date = new Date()
): OrganizationDigest {
  const counts = getDashboardCounts(documents, now);
  const alerts = buildDocumentAlerts(documents, now);

  const expired = alerts.filter((alert) => alert.status === "EXPIRED");
  const urgent = alerts.filter((alert) => alert.status === "URGENT");
  const expiringSoon = alerts.filter(
    (alert) => alert.status === "EXPIRING_SOON"
  );

  // The single most pressing document is the one with the fewest days
  // remaining (expired documents have negative values, so they sort first).
  const mostUrgent =
    alerts.length > 0
      ? alerts.reduce((worst, candidate) =>
          candidate.remainingDays < worst.remainingDays ? candidate : worst
        )
      : null;

  return {
    counts,
    expired,
    urgent,
    expiringSoon,
    mostUrgent,
    hasIssues: expired.length + urgent.length + expiringSoon.length > 0,
  };
}

function remainingDaysMeta(alert: DocumentAlert): string {
  if (alert.status === "EXPIRED") {
    const days = Math.abs(alert.remainingDays);
    return `Expired ${days} day${days === 1 ? "" : "s"} ago · ${formatDate(alert.expiresAt)}`;
  }
  if (alert.remainingDays === 0) {
    return `Expires today · ${formatDate(alert.expiresAt)}`;
  }
  return `Expires in ${alert.remainingDays} day${alert.remainingDays === 1 ? "" : "s"} · ${formatDate(alert.expiresAt)}`;
}

function alertToRow(alert: DocumentAlert) {
  return {
    primary: `${alert.documentType} — ${alert.employeeName}`,
    secondary: `${alert.companyName} · ${alert.referenceId}`,
    meta: remainingDaysMeta(alert),
  };
}

const MAX_ROWS_PER_SECTION = 8;

export function renderDigestEmail(input: {
  digest: OrganizationDigest;
  organizationName?: string | null;
}): { subject: string; html: string } {
  const { digest } = input;
  const workspace = input.organizationName?.trim();

  const headline = digest.expired.length
    ? `${digest.expired.length} expired document${digest.expired.length === 1 ? "" : "s"} need attention`
    : digest.urgent.length
      ? `${digest.urgent.length} document${digest.urgent.length === 1 ? "" : "s"} expiring this week`
      : `${digest.expiringSoon.length} document${digest.expiringSoon.length === 1 ? "" : "s"} expiring soon`;

  const stats = statRow([
    { label: "Expired", value: digest.counts.expired, tone: "expired" },
    { label: "Urgent", value: digest.counts.urgent, tone: "urgent" },
    { label: "Expiring", value: digest.counts.expiringSoon, tone: "expiring" },
    { label: "Total", value: digest.counts.total, tone: "neutral" },
  ]);

  const mostUrgentHtml = digest.mostUrgent
    ? highlightCard({
        label: "Most urgent",
        primary: `${digest.mostUrgent.documentType} — ${digest.mostUrgent.employeeName}`,
        secondary: `${digest.mostUrgent.companyName} · ${digest.mostUrgent.referenceId}`,
        meta: remainingDaysMeta(digest.mostUrgent),
        tone:
          digest.mostUrgent.status === "EXPIRED"
            ? "expired"
            : digest.mostUrgent.status === "URGENT"
              ? "urgent"
              : "expiring",
      })
    : "";

  const contentHtml = [
    stats,
    mostUrgentHtml,
    documentListSection({
      title: "Expired",
      tone: "expired",
      rows: digest.expired.slice(0, MAX_ROWS_PER_SECTION).map(alertToRow),
    }),
    documentListSection({
      title: "Urgent — within 7 days",
      tone: "urgent",
      rows: digest.urgent.slice(0, MAX_ROWS_PER_SECTION).map(alertToRow),
    }),
    documentListSection({
      title: "Expiring soon — within 30 days",
      tone: "expiring",
      rows: digest.expiringSoon.slice(0, MAX_ROWS_PER_SECTION).map(alertToRow),
    }),
  ].join("");

  return {
    subject: `[${APP_NAME}] Daily compliance digest — ${headline}`,
    html: emailLayout({
      preheader: headline,
      eyebrow: "Daily compliance digest",
      heading: headline,
      intro: workspace
        ? `Here is today's compliance summary for <strong>${workspace}</strong>.`
        : "Here is today's compliance summary for your workspace.",
      contentHtml,
      cta: { label: `Review in ${APP_NAME}`, href: dashboardUrl("/dashboard/reminders") },
    }),
  };
}

export function renderHealthyEmail(input: {
  digest: OrganizationDigest;
  organizationName?: string | null;
  frequency: HealthyReportFrequency;
}): { subject: string; html: string } {
  const { digest } = input;
  const workspace = input.organizationName?.trim();

  const stats = statRow([
    { label: "Expired", value: digest.counts.expired, tone: "healthy" },
    { label: "Urgent", value: digest.counts.urgent, tone: "healthy" },
    { label: "Expiring", value: digest.counts.expiringSoon, tone: "healthy" },
    { label: "Total", value: digest.counts.total, tone: "neutral" },
  ]);

  const cadence = input.frequency === "daily" ? "daily" : "weekly";

  return {
    subject: `[${APP_NAME}] All documents in good standing`,
    html: emailLayout({
      preheader: "Everything is compliant — no action needed.",
      eyebrow: `${cadence} status report`,
      heading: "Everything is in good standing",
      intro: workspace
        ? `Good news — all ${digest.counts.total} tracked document${digest.counts.total === 1 ? "" : "s"} for <strong>${workspace}</strong> are valid. Nothing is expired, urgent, or expiring within 30 days.`
        : `Good news — all ${digest.counts.total} tracked document${digest.counts.total === 1 ? "" : "s"} are valid. Nothing is expired, urgent, or expiring within 30 days.`,
      contentHtml: stats,
      cta: { label: `Open ${APP_NAME}`, href: dashboardUrl("/home") },
      footerNote: `You receive this ${cadence} healthy-status report because everything is compliant. Change the cadence anytime in notification settings.`,
    }),
  };
}

export async function sendOrganizationDigest(input: {
  organizationId: string;
  organizationName?: string | null;
  userId: string;
  recipientEmail: string;
  digest: OrganizationDigest;
  healthyReportFrequency: HealthyReportFrequency;
  now?: Date;
}): Promise<{ sent: boolean; kind: "digest" | "healthy" | "none"; reason?: string; messageId?: string }> {
  const now = input.now ?? new Date();
  const configurationError = getEmailProviderConfigurationError();
  if (configurationError) {
    return { sent: false, kind: "none", reason: configurationError };
  }

  const isHealthy = !input.digest.hasIssues;

  // Weekly healthy reports only go out on Mondays (UTC). Daily reports and
  // issue digests are sent every day. Per-day duplicate protection still applies.
  if (isHealthy && input.healthyReportFrequency === "weekly" && now.getUTCDay() !== 1) {
    return { sent: false, kind: "none", reason: "Weekly report not due today" };
  }

  const kind: "digest" | "healthy" = isHealthy ? "healthy" : "digest";
  const dateKey = formatDateKey(now);
  const reminderKey = `${kind === "healthy" ? "HEALTHY" : "DIGEST"}:${dateKey}`;

  const alreadySent = await prisma.notificationLog.findFirst({
    where: {
      organizationId: input.organizationId,
      documentId: DIGEST_DOCUMENT_SENTINEL,
      userId: input.userId,
      reminderKey,
      status: "SENT",
    },
  });

  if (alreadySent) {
    return { sent: false, kind, reason: "Already sent today" };
  }

  const { subject, html } =
    kind === "healthy"
      ? renderHealthyEmail({
          digest: input.digest,
          organizationName: input.organizationName,
          frequency: input.healthyReportFrequency,
        })
      : renderDigestEmail({
          digest: input.digest,
          organizationName: input.organizationName,
        });

  try {
    const result = await sendEmail({
      from: getFromEmail(),
      to: input.recipientEmail,
      subject,
      html,
      tracking: {
        emailType: kind === "healthy" ? "HEALTHY_REPORT" : "DAILY_DIGEST",
        organizationId: input.organizationId,
        userId: input.userId,
        documentId: DIGEST_DOCUMENT_SENTINEL,
        metadata: { reminderKey, kind },
      },
    });

    await prisma.notificationLog.create({
      data: {
        organizationId: input.organizationId,
        documentId: DIGEST_DOCUMENT_SENTINEL,
        userId: input.userId,
        userEmail: input.recipientEmail,
        alertType: kind === "healthy" ? "HEALTHY" : "DIGEST",
        reminderKey,
        status: "SENT",
      },
    });

    return { sent: true, kind, messageId: result.id };
  } catch (error) {
    await prisma.notificationLog.create({
      data: {
        organizationId: input.organizationId,
        documentId: DIGEST_DOCUMENT_SENTINEL,
        userId: input.userId,
        userEmail: input.recipientEmail,
        alertType: kind === "healthy" ? "HEALTHY" : "DIGEST",
        reminderKey,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown email failure",
      },
    });

    return {
      sent: false,
      kind,
      reason: error instanceof Error ? error.message : "Unknown email failure",
    };
  }
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
