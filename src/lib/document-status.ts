import { daysUntil } from "@/lib/format";

export const URGENT_DAYS = 7;
export const NEAR_EXPIRY_DAYS = 30;

export type ExpiryStatus = "VALID" | "EXPIRING_SOON" | "URGENT" | "EXPIRED";

export const EXPIRY_STATUS_LABELS: Record<ExpiryStatus, string> = {
  VALID: "Valid",
  EXPIRING_SOON: "Expiring soon",
  URGENT: "Urgent",
  EXPIRED: "Expired",
};

export function getExpiryStatus(
  expiresAt: Date | string,
  now: Date = new Date()
): ExpiryStatus {
  const days = daysUntil(expiresAt, now);

  if (days < 0) return "EXPIRED";
  if (days <= URGENT_DAYS) return "URGENT";
  if (days <= NEAR_EXPIRY_DAYS) return "EXPIRING_SOON";
  return "VALID";
}

export function getRemainingDays(expiresAt: Date | string, now: Date = new Date()): number {
  return daysUntil(expiresAt, now);
}

export function needsAlert(status: ExpiryStatus): boolean {
  return status !== "VALID";
}

export function alertPriority(status: ExpiryStatus): number {
  const order: Record<ExpiryStatus, number> = {
    EXPIRED: 0,
    URGENT: 1,
    EXPIRING_SOON: 2,
    VALID: 3,
  };
  return order[status];
}

export function alertMessage(
  documentType: string,
  companyName: string,
  expiresAt: Date | string,
  status: ExpiryStatus
): string {
  const days = getRemainingDays(expiresAt);

  switch (status) {
    case "EXPIRED":
      return `${documentType} for ${companyName} expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago — renewal required`;
    case "URGENT":
      return days === 0
        ? `${documentType} for ${companyName} expires today — renew immediately`
        : `${documentType} for ${companyName} expires in ${days} day${days === 1 ? "" : "s"} — urgent action needed`;
    case "EXPIRING_SOON":
      return `${documentType} for ${companyName} expires in ${days} days — plan renewal soon`;
    default:
      return `${documentType} for ${companyName} is valid`;
  }
}

export type ReminderKey =
  | "REMINDER_30"
  | "REMINDER_14"
  | "REMINDER_7"
  | "REMINDER_3"
  | "REMINDER_1"
  | "REMINDER_EXPIRED";

export const DEFAULT_REMINDER_SCHEDULE = "30,14,7,3,1,expired";

export function getReminderKeyForDays(daysRemaining: number): ReminderKey | null {
  if (daysRemaining === 30) return "REMINDER_30";
  if (daysRemaining === 14) return "REMINDER_14";
  if (daysRemaining === 7) return "REMINDER_7";
  if (daysRemaining === 3) return "REMINDER_3";
  if (daysRemaining === 1) return "REMINDER_1";
  if (daysRemaining < 0) return "REMINDER_EXPIRED";
  return null;
}

export function getReminderLabel(reminderKey: ReminderKey) {
  const labels: Record<ReminderKey, string> = {
    REMINDER_30: "30-day reminder",
    REMINDER_14: "14-day reminder",
    REMINDER_7: "7-day reminder",
    REMINDER_3: "3-day reminder",
    REMINDER_1: "1-day reminder",
    REMINDER_EXPIRED: "Expired reminder",
  };

  return labels[reminderKey];
}

export function parseReminderSchedule(schedule?: string | null) {
  return new Set(
    (schedule || DEFAULT_REMINDER_SCHEDULE)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function reminderKeyToScheduleValue(reminderKey: ReminderKey) {
  const values: Record<ReminderKey, string> = {
    REMINDER_30: "30",
    REMINDER_14: "14",
    REMINDER_7: "7",
    REMINDER_3: "3",
    REMINDER_1: "1",
    REMINDER_EXPIRED: "expired",
  };

  return values[reminderKey];
}
