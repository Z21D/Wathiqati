import {
  buildDocumentAlerts,
  getDocumentsForOrganization,
  type DocumentAlert,
} from "@/lib/documents";
import {
  buildOrganizationDigest,
  renderDigestEmail,
  renderHealthyEmail,
  type HealthyReportFrequency,
} from "@/lib/email/digest";
import {
  getReminderKeyForDays,
  getReminderLabel,
  parseReminderSchedule,
  reminderKeyToScheduleValue,
} from "@/lib/document-status";
import { EMAIL_TYPE_LABELS } from "@/lib/email/types";
import {
  APP_NAME,
  getFromEmail,
  sendEmail,
} from "@/lib/email/client";
import { emailLayout } from "@/lib/email/templates";

export type SimulationReminderItem = {
  documentId: string;
  employeeName: string;
  documentType: string;
  companyName: string;
  status: string;
  remainingDays: number;
  reminderLabel: string;
  template: string;
  wouldSend: boolean;
  skipReason?: string;
};

export type SimulationDigestItem = {
  kind: "digest" | "healthy" | "none";
  template: string;
  wouldSend: boolean;
  skipReason?: string;
  expired: number;
  urgent: number;
  expiringSoon: number;
};

export type ReminderSimulationResult = {
  recipientEmail: string;
  recipientName?: string | null;
  reminderSchedule: string;
  healthyReportFrequency: string;
  expired: DocumentAlert[];
  urgent: DocumentAlert[];
  expiringSoon: DocumentAlert[];
  reminders: SimulationReminderItem[];
  digest: SimulationDigestItem;
};

export async function buildReminderSimulation(input: {
  organizationId: string;
  userId: string;
  recipientEmail: string;
  recipientName?: string | null;
  reminderSchedule: string;
  expiredReminderFrequency: "once" | "daily";
  healthyReportFrequency: HealthyReportFrequency;
  emailRemindersEnabled: boolean;
  now?: Date;
}): Promise<ReminderSimulationResult> {
  const now = input.now ?? new Date();
  const documents = await getDocumentsForOrganization(input.organizationId);
  const alerts = buildDocumentAlerts(documents, now);
  const enabledSchedule = parseReminderSchedule(input.reminderSchedule);

  const expired = alerts.filter((alert) => alert.status === "EXPIRED");
  const urgent = alerts.filter((alert) => alert.status === "URGENT");
  const expiringSoon = alerts.filter(
    (alert) => alert.status === "EXPIRING_SOON"
  );

  const reminders: SimulationReminderItem[] = [];

  for (const alert of alerts) {
    const reminderKey = getReminderKeyForDays(alert.remainingDays);
    let wouldSend = false;
    let skipReason: string | undefined;
    let reminderLabel = "No reminder today";
    let template = EMAIL_TYPE_LABELS.EXPIRY_REMINDER;

    if (!input.emailRemindersEnabled) {
      skipReason = "Email reminders are disabled";
    } else if (!reminderKey) {
      skipReason = "Not a scheduled reminder day";
    } else if (!enabledSchedule.has(reminderKeyToScheduleValue(reminderKey))) {
      skipReason = "Disabled by reminder schedule";
    } else {
      reminderLabel = getReminderLabel(reminderKey);
      wouldSend = true;
      template = `${EMAIL_TYPE_LABELS.EXPIRY_REMINDER} — ${reminderLabel}`;
    }

    reminders.push({
      documentId: alert.id,
      employeeName: alert.employeeName,
      documentType: alert.documentType,
      companyName: alert.companyName,
      status: alert.status,
      remainingDays: alert.remainingDays,
      reminderLabel,
      template,
      wouldSend,
      skipReason,
    });
  }

  const digestData = buildOrganizationDigest(documents, now);
  const digest: SimulationDigestItem = {
    kind: "none",
    template: "None",
    wouldSend: false,
    expired: digestData.expired.length,
    urgent: digestData.urgent.length,
    expiringSoon: digestData.expiringSoon.length,
  };

  if (!input.emailRemindersEnabled) {
    digest.skipReason = "Email reminders are disabled";
  } else if (!digestData.hasIssues) {
    digest.kind = "healthy";
    digest.template = EMAIL_TYPE_LABELS.HEALTHY_REPORT;
    if (
      input.healthyReportFrequency === "weekly" &&
      now.getUTCDay() !== 1
    ) {
      digest.skipReason = "Weekly healthy report not due today";
    } else {
      digest.wouldSend = true;
    }
  } else {
    digest.kind = "digest";
    digest.template = EMAIL_TYPE_LABELS.DAILY_DIGEST;
    digest.wouldSend = true;
  }

  return {
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    reminderSchedule: input.reminderSchedule,
    healthyReportFrequency: input.healthyReportFrequency,
    expired,
    urgent,
    expiringSoon,
    reminders,
    digest,
  };
}

export async function sendSimulationEmails(input: {
  organizationId: string;
  organizationName?: string | null;
  userId: string;
  recipientEmail: string;
  reminderSchedule: string;
  expiredReminderFrequency: "once" | "daily";
  healthyReportFrequency: HealthyReportFrequency;
  emailRemindersEnabled: boolean;
}) {
  const simulation = await buildReminderSimulation(input);
  let sent = 0;
  let skipped = 0;
  const results: Array<{ type: string; status: "sent" | "skipped"; reason?: string }> =
    [];

  for (const reminder of simulation.reminders) {
    if (!reminder.wouldSend) {
      skipped++;
      results.push({
        type: reminder.template,
        status: "skipped",
        reason: reminder.skipReason,
      });
      continue;
    }

    const alert = simulation.expired
      .concat(simulation.urgent, simulation.expiringSoon)
      .find((item) => item.id === reminder.documentId);

    if (!alert) {
      skipped++;
      continue;
    }

    try {
      await sendEmail({
        from: getFromEmail(),
        to: input.recipientEmail,
        subject: `[${APP_NAME}] [Simulation] ${reminder.reminderLabel}: ${alert.documentType}`,
        html: emailLayout({
          preheader: "Reminder simulation from Email Center",
          eyebrow: "Simulation",
          heading: reminder.reminderLabel,
          intro: `This is a simulated reminder for <strong>${alert.documentType}</strong>. No schedules or documents were changed.`,
          contentHtml: `<p style="margin:0;color:#6e6e73;line-height:1.6;">${alert.message}</p>`,
        }),
        tracking: {
          emailType: "SIMULATION",
          organizationId: input.organizationId,
          userId: input.userId,
          documentId: alert.id,
          metadata: { simulation: true, reminderLabel: reminder.reminderLabel },
        },
      });
      sent++;
      results.push({ type: reminder.template, status: "sent" });
    } catch (error) {
      results.push({
        type: reminder.template,
        status: "skipped",
        reason: error instanceof Error ? error.message : "Send failed",
      });
      skipped++;
    }
  }

  if (simulation.digest.wouldSend) {
    const documents = await getDocumentsForOrganization(input.organizationId);
    const digest = buildOrganizationDigest(documents);
    const rendered =
      simulation.digest.kind === "healthy"
        ? renderHealthyEmail({
            digest,
            organizationName: input.organizationName,
            frequency: input.healthyReportFrequency,
          })
        : renderDigestEmail({
            digest,
            organizationName: input.organizationName,
          });

    try {
      await sendEmail({
        from: getFromEmail(),
        to: input.recipientEmail,
        subject: `[${APP_NAME}] [Simulation] ${rendered.subject.replace(/^\[Wathiqati\] /, "")}`,
        html: rendered.html,
        tracking: {
          emailType: "SIMULATION",
          organizationId: input.organizationId,
          userId: input.userId,
          metadata: { simulation: true, kind: simulation.digest.kind },
        },
      });
      sent++;
      results.push({ type: simulation.digest.template, status: "sent" });
    } catch (error) {
      results.push({
        type: simulation.digest.template,
        status: "skipped",
        reason: error instanceof Error ? error.message : "Send failed",
      });
      skipped++;
    }
  } else if (simulation.digest.skipReason) {
    results.push({
      type: simulation.digest.template,
      status: "skipped",
      reason: simulation.digest.skipReason,
    });
    skipped++;
  }

  return { sent, skipped, results, simulation };
}
