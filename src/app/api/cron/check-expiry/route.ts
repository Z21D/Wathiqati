import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDocumentAlerts, getDocumentsForOrganization } from "@/lib/documents";
import { sendExpiryReminderEmail } from "@/lib/email/send-reminder";
import {
  getEmailProviderConfigurationError,
  getActiveEmailProvider,
} from "@/lib/email/client";
import { parseReminderSchedule } from "@/lib/document-status";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configurationError = getEmailProviderConfigurationError();
  if (configurationError) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: 0,
      message: configurationError,
      emailProvider: getActiveEmailProvider(),
    });
  }

  const memberships = await prisma.organizationMember.findMany({
    where:
      process.env.NODE_ENV === "production"
        ? { organization: { isTestData: false } }
        : undefined,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          notificationEmail: true,
          emailRemindersEnabled: true,
          reminderSchedule: true,
          expiredReminderFrequency: true,
        },
      },
      organization: true,
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const membership of memberships) {
    if (!membership.user.emailRemindersEnabled) {
      skipped++;
      continue;
    }

    const recipientEmail =
      membership.user.notificationEmail || membership.user.email;

    if (!recipientEmail) {
      skipped++;
      continue;
    }

    const documents = await getDocumentsForOrganization(membership.organizationId);
    const alerts = buildDocumentAlerts(documents);
    const enabledSchedule = parseReminderSchedule(membership.user.reminderSchedule);

    for (const alert of alerts) {
      try {
        const result = await sendExpiryReminderEmail({
          alert,
          userId: membership.userId,
          userEmail: recipientEmail,
          organizationId: membership.organizationId,
          enabledSchedule,
          expiredReminderFrequency:
            membership.user.expiredReminderFrequency === "daily" ? "daily" : "once",
        });

        if (result.sent) sent++;
        else skipped++;
      } catch (error) {
        console.error("Reminder email failed", {
          documentId: alert.id,
          userId: membership.userId,
          error,
        });
        failed++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, failed });
}
