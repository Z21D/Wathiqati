"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  buildDocumentAlerts,
  getDocumentsForOrganization,
} from "@/lib/documents";
import { getOrganizationForUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export type AlertActionState = {
  error?: string;
  success?: boolean;
};

async function requireAlertContext() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await getOrganizationForUser(session.user.id);
  if (!membership) throw new Error("No organization found");

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
  };
}

export async function markAlertReadAction(
  documentId: string,
  alertKey: string
): Promise<AlertActionState> {
  try {
    const { userId, organizationId } = await requireAlertContext();

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
      select: { id: true },
    });

    if (!document) {
      return { error: "Alert not found." };
    }

    await prisma.alertRead.upsert({
      where: {
        documentId_userId_alertKey: {
          documentId,
          userId,
          alertKey,
        },
      },
      create: {
        organizationId,
        documentId,
        userId,
        alertKey,
      },
      update: {
        readAt: new Date(),
      },
    });

    revalidateAlertPaths();
    return { success: true };
  } catch {
    return { error: "Failed to mark alert as read." };
  }
}

export async function markAllAlertsReadAction(): Promise<AlertActionState> {
  try {
    const { userId, organizationId } = await requireAlertContext();
    const documents = await getDocumentsForOrganization(organizationId);
    const alerts = buildDocumentAlerts(documents);

    await prisma.$transaction(
      alerts.map((alert) =>
        prisma.alertRead.upsert({
          where: {
            documentId_userId_alertKey: {
              documentId: alert.id,
              userId,
              alertKey: alert.alertKey,
            },
          },
          create: {
            organizationId,
            documentId: alert.id,
            userId,
            alertKey: alert.alertKey,
          },
          update: {
            readAt: new Date(),
          },
        })
      )
    );

    revalidateAlertPaths();
    return { success: true };
  } catch {
    return { error: "Failed to mark alerts as read." };
  }
}

function revalidateAlertPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reminders");
}
