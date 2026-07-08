import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { EMAIL_TYPE_LABELS } from "@/lib/email/types";

function escapeCsv(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getOrganizationForUser(session.user.id);

  if (
    !membership ||
    (membership.role !== "OWNER" && membership.role !== "ADMIN")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await prisma.emailLog.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const header = [
    "Timestamp",
    "Recipient",
    "Subject",
    "Email Type",
    "Provider",
    "Status",
    "Delivery Status",
    "Message ID",
    "Error Message",
  ];

  const rows = logs.map((log) =>
    [
      log.createdAt.toISOString(),
      log.recipient,
      log.subject,
      EMAIL_TYPE_LABELS[log.emailType as keyof typeof EMAIL_TYPE_LABELS] ??
        log.emailType,
      log.provider,
      log.status,
      log.deliveryStatus,
      log.providerMessageId,
      log.error,
    ]
      .map(escapeCsv)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wathiqati-email-history.csv"`,
    },
  });
}
