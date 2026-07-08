"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEmailCenterAccess } from "@/lib/auth/email-center";
import { prisma } from "@/lib/prisma";
import { DEFAULT_REMINDER_SCHEDULE } from "@/lib/document-status";
import { sendTestEmail, sendVerificationEmail } from "@/lib/email/send-test";
import {
  buildReminderSimulation,
  sendSimulationEmails,
} from "@/lib/email/simulation";
import { getFromEmail, sendEmail } from "@/lib/email/client";
import { getEmailProviderConfigurationError } from "@/lib/email/client";

export type EmailCenterActionState = {
  error?: string;
  success?: string;
  data?: unknown;
};

const emailSettingsSchema = z.object({
  notificationEmail: z
    .union([z.email("Enter a valid notification email"), z.literal("")])
    .optional(),
  emailRemindersEnabled: z.boolean(),
  reminderSchedule: z.string().min(1, "Select at least one reminder"),
  expiredReminderFrequency: z.enum(["once", "daily"]).default("once"),
  healthyReportFrequency: z.enum(["daily", "weekly"]).default("weekly"),
});

export async function updateEmailCenterSettingsAction(
  _prevState: EmailCenterActionState,
  formData: FormData
): Promise<EmailCenterActionState> {
  try {
    const { user } = await requireEmailCenterAccess();

    const parsed = emailSettingsSchema.safeParse({
      notificationEmail: formData.get("notificationEmail")?.toString().trim(),
      emailRemindersEnabled: formData.get("emailRemindersEnabled") === "on",
      reminderSchedule:
        formData
          .getAll("reminderSchedule")
          .map((value) => value.toString())
          .join(",") || DEFAULT_REMINDER_SCHEDULE,
      expiredReminderFrequency:
        formData.get("expiredReminderFrequency")?.toString() === "daily"
          ? "daily"
          : "once",
      healthyReportFrequency:
        formData.get("healthyReportFrequency")?.toString() === "daily"
          ? "daily"
          : "weekly",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        notificationEmail: parsed.data.notificationEmail || null,
        emailRemindersEnabled: parsed.data.emailRemindersEnabled,
        reminderSchedule: parsed.data.reminderSchedule,
        expiredReminderFrequency: parsed.data.expiredReminderFrequency,
        healthyReportFrequency: parsed.data.healthyReportFrequency,
      },
    });

    revalidatePath("/dashboard/settings/email");
    revalidatePath("/dashboard/settings");
    return { success: "Email settings updated." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update settings.",
    };
  }
}

export async function sendTestEmailAction(): Promise<EmailCenterActionState> {
  try {
    const context = await requireEmailCenterAccess();
    const result = await sendTestEmail({
      recipientEmail: context.notificationEmail,
      organizationId: context.organizationId,
      userId: context.user.id,
      organizationName: context.organizationName,
    });

    revalidatePath("/dashboard/settings/email");

    if (!result.sent) {
      return { error: result.reason ?? "Test email failed." };
    }

    return { success: "Test email sent successfully." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Test email failed.",
    };
  }
}

export async function sendVerificationEmailAction(): Promise<EmailCenterActionState> {
  try {
    const context = await requireEmailCenterAccess();
    const result = await sendVerificationEmail({
      recipientEmail: context.notificationEmail,
      organizationId: context.organizationId,
      userId: context.user.id,
      organizationName: context.organizationName,
    });

    revalidatePath("/dashboard/settings/email");

    if (!result.sent) {
      return { error: result.reason ?? "Verification email failed." };
    }

    return { success: "Verification email sent successfully." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Verification email failed.",
    };
  }
}

export async function runReminderSimulationAction(): Promise<EmailCenterActionState> {
  try {
    const context = await requireEmailCenterAccess();
    const simulation = await buildReminderSimulation({
      organizationId: context.organizationId,
      userId: context.user.id,
      recipientEmail: context.notificationEmail,
      recipientName: context.user.name,
      reminderSchedule: context.user.reminderSchedule,
      expiredReminderFrequency:
        context.user.expiredReminderFrequency === "daily" ? "daily" : "once",
      healthyReportFrequency:
        context.user.healthyReportFrequency === "daily" ? "daily" : "weekly",
      emailRemindersEnabled: context.user.emailRemindersEnabled,
    });

    return { success: "Simulation ready.", data: simulation };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Simulation failed.",
    };
  }
}

export async function sendSimulationEmailsAction(): Promise<EmailCenterActionState> {
  try {
    const context = await requireEmailCenterAccess();
    const result = await sendSimulationEmails({
      organizationId: context.organizationId,
      organizationName: context.organizationName,
      userId: context.user.id,
      recipientEmail: context.notificationEmail,
      reminderSchedule: context.user.reminderSchedule,
      expiredReminderFrequency:
        context.user.expiredReminderFrequency === "daily" ? "daily" : "once",
      healthyReportFrequency:
        context.user.healthyReportFrequency === "daily" ? "daily" : "weekly",
      emailRemindersEnabled: context.user.emailRemindersEnabled,
    });

    revalidatePath("/dashboard/settings/email");
    return {
      success: `Simulation complete. ${result.sent} sent, ${result.skipped} skipped.`,
      data: result,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Simulation send failed.",
    };
  }
}

export async function retryFailedEmailAction(
  emailLogId: string
): Promise<EmailCenterActionState> {
  try {
    const context = await requireEmailCenterAccess();
    const configurationError = getEmailProviderConfigurationError();

    if (configurationError) {
      return { error: configurationError };
    }

    const emailLog = await prisma.emailLog.findFirst({
      where: {
        id: emailLogId,
        organizationId: context.organizationId,
        status: "FAILED",
      },
    });

    if (!emailLog?.htmlContent) {
      return { error: "Failed email not found or cannot be retried." };
    }

    await sendEmail({
      from: getFromEmail(),
      to: emailLog.recipient,
      subject: emailLog.subject,
      html: emailLog.htmlContent,
      tracking: {
        emailType: emailLog.emailType as
          | "WELCOME"
          | "PASSWORD_RESET"
          | "VERIFICATION"
          | "ACCOUNT_DELETED"
          | "DAILY_DIGEST"
          | "HEALTHY_REPORT"
          | "EXPIRY_REMINDER"
          | "TEST_EMAIL"
          | "SIMULATION",
        organizationId: emailLog.organizationId ?? undefined,
        userId: emailLog.userId ?? undefined,
        documentId: emailLog.documentId ?? undefined,
        metadata: { retryOf: emailLog.id },
      },
    });

    revalidatePath("/dashboard/settings/email");
    return { success: "Email retry sent successfully." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Retry failed.",
    };
  }
}
