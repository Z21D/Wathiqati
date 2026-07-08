import { prisma } from "@/lib/prisma";
import {
  APP_NAME,
  getAppUrl,
  getEmailProviderConfigurationError,
  getFromEmail,
  sendEmail,
} from "@/lib/email/client";
import type { DocumentAlert } from "@/lib/documents";
import {
  getReminderKeyForDays,
  getReminderLabel,
  reminderKeyToScheduleValue,
  type ReminderKey,
} from "@/lib/document-status";

export type ExpiredReminderFrequency = "once" | "daily";

export async function wasReminderSent(
  documentId: string,
  userId: string,
  reminderKey: string
) {
  return prisma.notificationLog.findFirst({
    where: {
      documentId,
      userId,
      reminderKey,
      status: "SENT",
    },
  });
}

export async function sendExpiryReminderEmail(input: {
  alert: DocumentAlert;
  userId: string;
  userEmail: string;
  organizationId: string;
  enabledSchedule?: Set<string>;
  expiredReminderFrequency?: ExpiredReminderFrequency;
  now?: Date;
}) {
  const reminderKey = getReminderKeyForDays(input.alert.remainingDays);
  if (!reminderKey) {
    return { sent: false, reason: "Not a scheduled reminder day" };
  }

  if (
    input.enabledSchedule &&
    !input.enabledSchedule.has(reminderKeyToScheduleValue(reminderKey))
  ) {
    return { sent: false, reason: "Reminder disabled by schedule preference" };
  }

  const logReminderKey = getNotificationLogReminderKey({
    reminderKey,
    expiredReminderFrequency: input.expiredReminderFrequency ?? "once",
    now: input.now ?? new Date(),
  });

  const configurationError = getEmailProviderConfigurationError();
  if (configurationError) {
    return { sent: false, reason: configurationError };
  }

  const alreadySent = await wasReminderSent(
    input.alert.id,
    input.userId,
    logReminderKey
  );

  if (alreadySent) {
    return { sent: false, reason: "Reminder already sent" };
  }

  const reminderLabel = getReminderLabel(reminderKey);
  const subject = `[${APP_NAME}] ${reminderLabel}: ${input.alert.documentType}`;

  const html = `
    <div style="margin:0;background:#f5f5f7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e5ea;border-radius:28px;padding:32px;box-shadow:0 12px 40px rgba(0,0,0,0.08);">
        <p style="margin:0 0 12px;color:#86868b;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;">${reminderLabel}</p>
        <h1 style="margin:0;color:#1d1d1f;font-size:28px;line-height:1.2;">Document expiry alert</h1>
        <p style="margin:16px 0 0;color:#6e6e73;line-height:1.6;font-size:16px;">${input.alert.message}</p>
        <div style="margin:28px 0;padding:20px;border-radius:20px;background:#f5f5f7;">
          <p style="margin:0;color:#1d1d1f;"><strong>Employee:</strong> ${input.alert.employeeName}</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Company:</strong> ${input.alert.companyName}</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Document:</strong> ${input.alert.documentType}</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Number:</strong> ${input.alert.referenceId}</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Expiry date:</strong> ${new Date(input.alert.expiresAt).toLocaleDateString()}</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Days remaining:</strong> ${input.alert.remainingDays}</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Status:</strong> ${input.alert.status.replace(/_/g, " ")}</p>
        </div>
        <a href="${getAppUrl()}/dashboard/reminders" style="display:inline-block;background:#1d1d1f;color:white;text-decoration:none;padding:13px 18px;border-radius:999px;font-weight:600;">View in ${APP_NAME}</a>
        <p style="margin:28px 0 0;color:#86868b;font-size:12px;line-height:1.5;">You are receiving this because ${APP_NAME} is monitoring this document for your workspace.</p>
      </div>
    </div>
  `;

  try {
    const result = await sendEmail({
      from: getFromEmail(),
      to: input.userEmail,
      subject,
      html,
      tracking: {
        emailType: "EXPIRY_REMINDER",
        organizationId: input.organizationId,
        userId: input.userId,
        documentId: input.alert.id,
        metadata: {
          alertType: input.alert.status,
          reminderKey: logReminderKey,
        },
      },
    });

    await prisma.notificationLog.create({
      data: {
        organizationId: input.organizationId,
        documentId: input.alert.id,
        userId: input.userId,
        userEmail: input.userEmail,
        alertType: input.alert.status,
        reminderKey: logReminderKey,
        status: "SENT",
      },
    });

    return { sent: true, messageId: result.id };
  } catch (error) {
    await prisma.notificationLog.create({
      data: {
        organizationId: input.organizationId,
        documentId: input.alert.id,
        userId: input.userId,
        userEmail: input.userEmail,
        alertType: input.alert.status,
        reminderKey: logReminderKey,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown email failure",
      },
    });

    throw error;
  }
}

function getNotificationLogReminderKey({
  reminderKey,
  expiredReminderFrequency,
  now,
}: {
  reminderKey: ReminderKey;
  expiredReminderFrequency: ExpiredReminderFrequency;
  now: Date;
}) {
  if (reminderKey !== "REMINDER_EXPIRED" || expiredReminderFrequency !== "daily") {
    return reminderKey;
  }

  return `${reminderKey}:${formatDateKey(now)}`;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
