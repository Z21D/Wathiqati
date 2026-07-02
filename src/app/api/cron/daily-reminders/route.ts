import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDocumentsForOrganization } from "@/lib/documents";
import {
  buildOrganizationDigest,
  sendOrganizationDigest,
  type HealthyReportFrequency,
} from "@/lib/email/digest";

// Pick one recipient per organization: prefer the OWNER, then ADMIN, then any
// member that has email reminders enabled and a deliverable address.
const ROLE_PRIORITY: Record<string, number> = {
  OWNER: 0,
  ADMIN: 1,
  MEMBER: 2,
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      ok: true,
      organizations: 0,
      digestsSent: 0,
      healthySent: 0,
      skipped: 0,
      failed: 0,
      message: "RESEND_API_KEY not configured",
    });
  }

  const now = new Date();

  const organizations = await prisma.organization.findMany({
    where:
      process.env.NODE_ENV === "production" ? { isTestData: false } : undefined,
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              notificationEmail: true,
              emailRemindersEnabled: true,
              healthyReportFrequency: true,
            },
          },
        },
      },
    },
  });

  let digestsSent = 0;
  let healthySent = 0;
  let skipped = 0;
  let failed = 0;

  for (const organization of organizations) {
    const recipient = [...organization.members]
      .sort(
        (a, b) =>
          (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99)
      )
      .find((member) => {
        const email = member.user.notificationEmail || member.user.email;
        return member.user.emailRemindersEnabled && Boolean(email);
      });

    if (!recipient) {
      skipped++;
      continue;
    }

    const recipientEmail =
      recipient.user.notificationEmail || recipient.user.email;

    if (!recipientEmail) {
      skipped++;
      continue;
    }

    const documents = await getDocumentsForOrganization(organization.id);
    const digest = buildOrganizationDigest(documents, now);

    const healthyReportFrequency: HealthyReportFrequency =
      recipient.user.healthyReportFrequency === "daily" ? "daily" : "weekly";

    try {
      const result = await sendOrganizationDigest({
        organizationId: organization.id,
        organizationName: organization.name,
        userId: recipient.user.id,
        recipientEmail,
        digest,
        healthyReportFrequency,
        now,
      });

      if (result.sent && result.kind === "digest") digestsSent++;
      else if (result.sent && result.kind === "healthy") healthySent++;
      else skipped++;
    } catch (error) {
      console.error("Daily digest failed", {
        organizationId: organization.id,
        error,
      });
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    organizations: organizations.length,
    digestsSent,
    healthySent,
    skipped,
    failed,
  });
}
