import type { Document, Company } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  alertMessage,
  alertPriority,
  getDocumentStatusDetails,
  needsAlert,
  type ExpiryStatus,
} from "@/lib/document-status";

export type DocumentWithCompany = Document & { company: Company };

export type DocumentAlert = {
  id: string;
  companyName: string;
  employeeName: string;
  documentType: string;
  referenceId: string;
  expiresAt: Date;
  status: ExpiryStatus;
  remainingDays: number;
  message: string;
  alertKey: string;
  isRead?: boolean;
};

export function getDocumentPersonName(document: DocumentWithCompany) {
  return document.employeeName?.trim() || document.company.name;
}

export function enrichDocument(document: DocumentWithCompany, now: Date = new Date()) {
  const { status, remainingDays } = getDocumentStatusDetails(document, now);

  return {
    ...document,
    status,
    remainingDays,
    statusLabel: status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
  };
}

export function buildDocumentAlerts(
  documents: DocumentWithCompany[],
  now: Date = new Date()
): DocumentAlert[] {
  return documents
    .map((document) => {
      const { status, remainingDays } = getDocumentStatusDetails(document, now);
      if (!needsAlert(status)) return null;

      const alert: DocumentAlert = {
        id: document.id,
        companyName: document.company.name,
        employeeName: getDocumentPersonName(document),
        documentType: document.documentType,
        referenceId: document.referenceId,
        expiresAt: document.expiresAt,
        status,
        remainingDays,
        alertKey: status,
        message: alertMessage(
          document.documentType,
          getDocumentPersonName(document),
          document.expiresAt,
          status
        ),
      };

      return alert;
    })
    .filter((alert): alert is DocumentAlert => alert !== null)
    .sort((a, b) => alertPriority(a.status) - alertPriority(b.status));
}

export function getDashboardCounts(
  documents: DocumentWithCompany[],
  now: Date = new Date()
) {
  const counts = {
    total: documents.length,
    valid: 0,
    expiringSoon: 0,
    urgent: 0,
    expired: 0,
  };

  for (const document of documents) {
    const { status } = getDocumentStatusDetails(document, now);
    switch (status) {
      case "VALID":
        counts.valid++;
        break;
      case "EXPIRING_SOON":
        counts.expiringSoon++;
        break;
      case "URGENT":
        counts.urgent++;
        break;
      case "EXPIRED":
        counts.expired++;
        break;
    }
  }

  const categoryTotal =
    counts.valid + counts.expiringSoon + counts.urgent + counts.expired;
  if (categoryTotal !== counts.total) {
    console.error("Dashboard counts are inconsistent.", {
      totalDocuments: counts.total,
      categoryTotal,
      counts,
    });
  }

  return counts;
}

export async function getDocumentsForOrganization(organizationId: string) {
  return prisma.document.findMany({
    where: { organizationId },
    include: { company: true },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
  });
}

export function getUpcomingExpiries(
  documents: DocumentWithCompany[],
  limit = 8,
  now: Date = new Date()
) {
  return documents
    .map((document) => enrichDocument(document, now))
    .sort((a, b) => a.remainingDays - b.remainingDays)
    .slice(0, limit);
}

export async function getRecentImports(organizationId: string, limit = 5) {
  return prisma.importLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getReadAlertKeysForUser(input: {
  organizationId: string;
  userId: string;
}) {
  const reads = await prisma.alertRead.findMany({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
    },
    select: {
      documentId: true,
      alertKey: true,
    },
  });

  return new Set(reads.map((read) => `${read.documentId}:${read.alertKey}`));
}

export async function getAlertsForUser(input: {
  organizationId: string;
  userId: string;
}) {
  const documents = await getDocumentsForOrganization(input.organizationId);
  const alerts = buildDocumentAlerts(documents);
  const readKeys = await getReadAlertKeysForUser(input);

  return applyReadStateToAlerts(alerts, readKeys);
}

export function applyReadStateToAlerts(
  alerts: DocumentAlert[],
  readKeys: Set<string>
) {
  return alerts.map((alert) => ({
    ...alert,
    isRead: readKeys.has(`${alert.id}:${alert.alertKey}`),
  }));
}

export function getTopPriorityCounts(alerts: DocumentAlert[]) {
  const counts = {
    expired: 0,
    oneDay: 0,
    threeDays: 0,
    sevenDays: 0,
    fourteenDays: 0,
    total: 0,
  };

  for (const alert of alerts) {
    if (alert.status === "EXPIRED") counts.expired++;
    if (alert.remainingDays === 1) counts.oneDay++;
    if (alert.remainingDays <= 3 && alert.remainingDays >= 0) counts.threeDays++;
    if (alert.remainingDays <= 7 && alert.remainingDays >= 0) counts.sevenDays++;
    if (alert.remainingDays <= 14 && alert.remainingDays >= 0) counts.fourteenDays++;
  }

  counts.total = alerts.filter(
    (alert) => alert.status === "EXPIRED" || alert.remainingDays <= 14
  ).length;

  return counts;
}

export async function logImport(input: {
  organizationId: string;
  fileName?: string;
  imported: number;
  created: number;
  updated: number;
  skipped: number;
}) {
  return prisma.importLog.create({ data: input });
}
