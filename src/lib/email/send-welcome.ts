import { APP_NAME, getFromEmail, getResendClient } from "@/lib/email/client";
import { dashboardUrl, emailLayout } from "@/lib/email/templates";

export async function sendWelcomeEmail(input: {
  name?: string | null;
  email: string;
  organizationName?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const firstName = input.name?.trim().split(/\s+/)[0] || "there";
  const workspace = input.organizationName?.trim();

  const contentHtml = `
    <div style="margin-top:24px;border:1px solid #e5e5ea;border-radius:20px;padding:20px;background:#f5f5f7;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#86868b;">Get started in 3 steps</p>
      <p style="margin:0;color:#1d1d1f;font-size:15px;line-height:1.7;">
        1. Import your documents from Excel in seconds.<br/>
        2. We track every expiry date automatically.<br/>
        3. Get reminders before anything lapses — no spreadsheets, no surprises.
      </p>
    </div>`;

  const html = emailLayout({
    preheader: `Welcome to ${APP_NAME} — let's keep your documents compliant.`,
    eyebrow: "Welcome aboard",
    heading: `Welcome to ${APP_NAME}, ${firstName}`,
    intro: workspace
      ? `Your workspace <strong>${workspace}</strong> is ready. ${APP_NAME} now watches your document expiry dates so your team never misses a renewal again.`
      : `Your workspace is ready. ${APP_NAME} now watches your document expiry dates so your team never misses a renewal again.`,
    contentHtml,
    cta: { label: "Open your dashboard", href: dashboardUrl("/home") },
    footerNote: `You are receiving this because you created a ${APP_NAME} account.`,
  });

  try {
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: input.email,
      subject: `Welcome to ${APP_NAME}`,
      html,
    });

    if (result.error) {
      console.error("Welcome email failed", {
        email: input.email,
        error: result.error,
      });
      return { sent: false, reason: result.error.message };
    }

    console.info("Welcome email sent", {
      email: input.email,
      resendId: result.data?.id,
    });

    return { sent: true };
  } catch (error) {
    console.error("Welcome email failed", {
      email: input.email,
      error,
    });
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown email failure",
    };
  }
}
