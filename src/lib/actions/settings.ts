"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_REMINDER_SCHEDULE } from "@/lib/document-status";

const notificationSettingsSchema = z.object({
  companyName: z.string().optional(),
  notificationEmail: z
    .union([z.email("Enter a valid notification email"), z.literal("")])
    .optional(),
  emailRemindersEnabled: z.boolean(),
  reminderSchedule: z.string().min(1, "Select at least one reminder"),
  expiredReminderFrequency: z.enum(["once", "daily"]).default("once"),
});

export type SettingsActionState = {
  error?: string;
  success?: boolean;
};

export async function updateNotificationSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = notificationSettingsSchema.safeParse({
    companyName: formData.get("companyName")?.toString().trim(),
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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }

  const {
    companyName,
    notificationEmail,
    emailRemindersEnabled,
    reminderSchedule,
    expiredReminderFrequency,
  } = parsed.data;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        companyName: companyName || null,
        notificationEmail: notificationEmail || null,
        emailRemindersEnabled,
        reminderSchedule,
        expiredReminderFrequency,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { error: "Failed to update notification settings." };
  }
}
