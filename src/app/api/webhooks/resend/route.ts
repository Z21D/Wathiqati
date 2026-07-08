import { NextResponse } from "next/server";
import { updateEmailLogDelivery } from "@/lib/email/email-log";
import type { DeliveryStatus } from "@/lib/email/types";

const RESEND_EVENT_MAP: Record<string, DeliveryStatus> = {
  "email.sent": "ACCEPTED",
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "DEFERRED",
  "email.bounced": "BOUNCED",
  "email.complained": "BLOCKED",
  "email.failed": "FAILED",
};

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, message: "Webhook not configured" },
      { status: 501 }
    );
  }

  const signature = request.headers.get("resend-signature");
  if (!signature || signature !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const eventType = payload?.type as string | undefined;
  const messageId = payload?.data?.email_id as string | undefined;

  if (!eventType || !messageId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const deliveryStatus = RESEND_EVENT_MAP[eventType] ?? "UNKNOWN";

  await updateEmailLogDelivery({
    providerMessageId: messageId,
    deliveryStatus,
    providerResponse: JSON.stringify(payload),
    deliveredAt: deliveryStatus === "DELIVERED" ? new Date() : undefined,
    error:
      deliveryStatus === "FAILED" || deliveryStatus === "BOUNCED"
        ? payload?.data?.error ?? eventType
        : undefined,
  });

  return NextResponse.json({ ok: true });
}
