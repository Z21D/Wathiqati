import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { EmailProvider } from "@/lib/email/provider";
import {
  buildBodyPreview,
  type DeliveryStatus,
  type EmailTrackingContext,
  type EmailType,
} from "@/lib/email/types";

export type CreateEmailLogInput = {
  recipient: string;
  subject: string;
  html: string;
  emailType: EmailType;
  provider: EmailProvider;
  organizationId?: string;
  userId?: string;
  documentId?: string;
  metadata?: Record<string, unknown>;
};

export type EmailSendOutcome = {
  success: boolean;
  providerMessageId?: string;
  providerResponse?: string;
  smtpResponse?: string;
  smtpCode?: number;
  deliveryStatus: DeliveryStatus;
  error?: string;
};

function initialDeliveryStatus(provider: EmailProvider): DeliveryStatus {
  return provider === "gmail" ? "ACCEPTED" : "ACCEPTED";
}

export async function createEmailLog(
  input: CreateEmailLogInput,
  outcome: EmailSendOutcome
) {
  const status = outcome.success ? "SENT" : "FAILED";

  return prisma.emailLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      recipient: input.recipient,
      subject: input.subject,
      bodyPreview: buildBodyPreview(input.html),
      htmlContent: input.html,
      emailType: input.emailType,
      provider: input.provider,
      providerMessageId: outcome.providerMessageId,
      providerResponse: outcome.providerResponse,
      status,
      deliveryStatus: outcome.deliveryStatus,
      error: outcome.error,
      smtpResponse: outcome.smtpResponse,
      smtpCode: outcome.smtpCode,
      deliveredAt: outcome.success ? new Date() : null,
      documentId: input.documentId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function updateEmailLogDelivery(input: {
  providerMessageId: string;
  deliveryStatus: DeliveryStatus;
  providerResponse?: string;
  error?: string;
  deliveredAt?: Date;
}) {
  const existing = await prisma.emailLog.findFirst({
    where: { providerMessageId: input.providerMessageId },
    orderBy: { createdAt: "desc" },
  });

  if (!existing) {
    return null;
  }

  return prisma.emailLog.update({
    where: { id: existing.id },
    data: {
      deliveryStatus: input.deliveryStatus,
      providerResponse: input.providerResponse ?? existing.providerResponse,
      error: input.error ?? existing.error,
      deliveredAt: input.deliveredAt ?? existing.deliveredAt,
      updatedAt: new Date(),
    },
  });
}

export function trackingToLogInput(
  input: {
    to: string;
    subject: string;
    html: string;
    provider: EmailProvider;
  },
  tracking: EmailTrackingContext
): CreateEmailLogInput {
  return {
    recipient: input.to,
    subject: input.subject,
    html: input.html,
    emailType: tracking.emailType,
    provider: input.provider,
    organizationId: tracking.organizationId,
    userId: tracking.userId,
    documentId: tracking.documentId,
    metadata: tracking.metadata,
  };
}

export function buildSuccessOutcome(
  provider: EmailProvider,
  result: {
    id?: string;
    providerResponse?: string;
    smtpResponse?: string;
    smtpCode?: number;
  }
): EmailSendOutcome {
  return {
    success: true,
    providerMessageId: result.id,
    providerResponse: result.providerResponse,
    smtpResponse: result.smtpResponse,
    smtpCode: result.smtpCode,
    deliveryStatus: initialDeliveryStatus(provider),
  };
}

export function buildFailureOutcome(error: unknown): EmailSendOutcome {
  return {
    success: false,
    deliveryStatus: "FAILED",
    error: error instanceof Error ? error.message : "Unknown email failure",
  };
}

export async function getEmailLogsForOrganization(
  organizationId: string,
  limit = 50
) {
  return prisma.emailLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getLastEmailByType(
  organizationId: string,
  emailType: EmailType,
  status?: "SENT" | "FAILED"
) {
  return prisma.emailLog.findFirst({
    where: {
      organizationId,
      emailType,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEmailDashboardStats(organizationId: string) {
  const [
    lastSuccess,
    lastFailed,
    lastWelcome,
    lastPasswordReset,
    lastDigest,
    lastHealthy,
    lastExpiry,
    lastVerification,
    lastTest,
    totalSent,
    totalFailed,
  ] = await Promise.all([
    prisma.emailLog.findFirst({
      where: { organizationId, status: "SENT" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.emailLog.findFirst({
      where: { organizationId, status: "FAILED" },
      orderBy: { createdAt: "desc" },
    }),
    getLastEmailByType(organizationId, "WELCOME"),
    getLastEmailByType(organizationId, "PASSWORD_RESET"),
    getLastEmailByType(organizationId, "DAILY_DIGEST"),
    getLastEmailByType(organizationId, "HEALTHY_REPORT"),
    getLastEmailByType(organizationId, "EXPIRY_REMINDER"),
    getLastEmailByType(organizationId, "VERIFICATION"),
    getLastEmailByType(organizationId, "TEST_EMAIL"),
    prisma.emailLog.count({ where: { organizationId, status: "SENT" } }),
    prisma.emailLog.count({ where: { organizationId, status: "FAILED" } }),
  ]);

  return {
    lastSuccess,
    lastFailed,
    lastWelcome,
    lastPasswordReset,
    lastDigest,
    lastHealthy,
    lastExpiry,
    lastVerification,
    lastTest,
    totalSent,
    totalFailed,
    queueStatus: "Idle",
  };
}
