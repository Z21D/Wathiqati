export const EMAIL_TYPES = [
  "WELCOME",
  "PASSWORD_RESET",
  "VERIFICATION",
  "ACCOUNT_DELETED",
  "DAILY_DIGEST",
  "HEALTHY_REPORT",
  "EXPIRY_REMINDER",
  "TEST_EMAIL",
  "SIMULATION",
] as const;

export type EmailType = (typeof EMAIL_TYPES)[number];

export const DELIVERY_STATUSES = [
  "ACCEPTED",
  "QUEUED",
  "DELIVERED",
  "REJECTED",
  "BOUNCED",
  "FAILED",
  "BLOCKED",
  "DEFERRED",
  "UNKNOWN",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export type EmailTrackingContext = {
  emailType: EmailType;
  organizationId?: string;
  userId?: string;
  documentId?: string;
  metadata?: Record<string, unknown>;
};

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  WELCOME: "Welcome",
  PASSWORD_RESET: "Password Reset",
  VERIFICATION: "Verification",
  ACCOUNT_DELETED: "Account Deleted",
  DAILY_DIGEST: "Daily Digest",
  HEALTHY_REPORT: "Healthy Report",
  EXPIRY_REMINDER: "Expiry Reminder",
  TEST_EMAIL: "Test Email",
  SIMULATION: "Simulation",
};

export function buildBodyPreview(html: string, maxLength = 280) {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}…`;
}
