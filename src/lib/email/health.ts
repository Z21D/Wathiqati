import { prisma } from "@/lib/prisma";
import {
  getActiveEmailProvider,
  getEmailProviderConfigurationError,
  getFromEmail,
  isEmailProviderConfigured,
} from "@/lib/email/provider";
import type { EmailProvider } from "@/lib/email/provider";

export type EmailHealthIssue = {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  recommendation: string;
};

export type EmailHealthReport = {
  provider: EmailProvider;
  senderEmail: string;
  providerStatus: "connected" | "disconnected" | "configuration_error";
  issues: EmailHealthIssue[];
  cronConfigured: boolean;
  resendWebhookReady: boolean;
};

function maskSecret(value?: string | null) {
  if (!value) return null;
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}…${value.slice(-2)}`;
}

export function getSenderEmailAddress() {
  const from = getFromEmail();
  const match = from.match(/<([^>]+)>/);
  return match?.[1] ?? from;
}

export async function getEmailHealthReport(input: {
  notificationEmail?: string | null;
  accountEmail: string;
}): Promise<EmailHealthReport> {
  const provider = getActiveEmailProvider();
  const senderEmail = getSenderEmailAddress();
  const configurationError = getEmailProviderConfigurationError();
  const issues: EmailHealthIssue[] = [];

  if (configurationError) {
    issues.push({
      id: "provider-config",
      severity: "error",
      title: "Email provider configuration error",
      recommendation: configurationError,
    });
  }

  if (provider === "gmail") {
    if (!process.env.GMAIL_USER) {
      issues.push({
        id: "gmail-user-missing",
        severity: "error",
        title: "GMAIL_USER is missing",
        recommendation: "Set GMAIL_USER in your environment variables.",
      });
    }
    if (!process.env.GMAIL_APP_PASSWORD) {
      issues.push({
        id: "gmail-password-missing",
        severity: "error",
        title: "GMAIL_APP_PASSWORD is missing",
        recommendation:
          "Create a Google App Password and set GMAIL_APP_PASSWORD in your environment.",
      });
    }
  }

  if (provider === "resend") {
    if (!process.env.RESEND_API_KEY) {
      issues.push({
        id: "resend-key-missing",
        severity: "error",
        title: "RESEND_API_KEY is missing",
        recommendation: "Add your Resend API key to the environment.",
      });
    }
    if (
      !process.env.RESEND_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL.includes("resend.dev")
    ) {
      issues.push({
        id: "resend-from-domain",
        severity: "warning",
        title: "Resend sender domain is not production-ready",
        recommendation:
          "Verify a custom domain in Resend and set RESEND_FROM_EMAIL to that domain.",
      });
    }
  }

  const effectiveNotificationEmail =
    input.notificationEmail?.trim() || input.accountEmail.trim();

  if (!effectiveNotificationEmail) {
    issues.push({
      id: "notification-email-missing",
      severity: "error",
      title: "Notification email is missing",
      recommendation:
        "Set a notification email in Email Center settings so reminders reach the right inbox.",
    });
  }

  if (!process.env.CRON_SECRET) {
    issues.push({
      id: "cron-secret-missing",
      severity: "warning",
      title: "CRON_SECRET is not configured",
      recommendation:
        "Set CRON_SECRET in Vercel so daily reminder cron jobs can run securely.",
    });
  }

  if (!process.env.AUTH_URL) {
    issues.push({
      id: "auth-url-missing",
      severity: "warning",
      title: "AUTH_URL is not configured",
      recommendation:
        "Set AUTH_URL to your production domain so email links resolve correctly.",
    });
  }

  const recentFailures = await prisma.emailLog.count({
    where: {
      status: "FAILED",
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (recentFailures > 0) {
    issues.push({
      id: "recent-failures",
      severity: "warning",
      title: `${recentFailures} email failure${recentFailures === 1 ? "" : "s"} in the last 24 hours`,
      recommendation:
        "Review Email History for failed deliveries and verify provider credentials.",
    });
  }

  let providerStatus: EmailHealthReport["providerStatus"] = "connected";
  if (configurationError) {
    providerStatus = "configuration_error";
  } else if (!isEmailProviderConfigured()) {
    providerStatus = "disconnected";
  }

  return {
    provider,
    senderEmail,
    providerStatus,
    issues,
    cronConfigured: Boolean(process.env.CRON_SECRET),
    resendWebhookReady: provider === "resend" && Boolean(process.env.RESEND_WEBHOOK_SECRET),
  };
}

export function getProviderDisplayInfo() {
  return {
    provider: getActiveEmailProvider(),
    senderEmail: getSenderEmailAddress(),
    fromHeader: getFromEmail(),
    gmailConfigured: Boolean(
      process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    gmailUserMasked: maskSecret(process.env.GMAIL_USER),
    resendFromEmail: process.env.RESEND_FROM_EMAIL ?? null,
  };
}
