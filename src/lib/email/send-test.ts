import {
  APP_NAME,
  getAppUrl,
  getEmailProviderConfigurationError,
  getFromEmail,
  sendEmail,
} from "@/lib/email/client";
import { emailLayout } from "@/lib/email/templates";

export async function sendTestEmail(input: {
  recipientEmail: string;
  organizationId: string;
  userId: string;
  organizationName?: string | null;
}) {
  const configurationError = getEmailProviderConfigurationError();
  if (configurationError) {
    return { sent: false, reason: configurationError };
  }

  const html = emailLayout({
    preheader: "Wathiqati test email",
    eyebrow: "Test email",
    heading: "Email Center test successful",
    intro: input.organizationName
      ? `This is a live test email from ${APP_NAME} for <strong>${input.organizationName}</strong>.`
      : `This is a live test email from ${APP_NAME}.`,
    contentHtml: `
      <div style="margin-top:24px;border:1px solid #e5e5ea;border-radius:20px;padding:20px;background:#f5f5f7;">
        <p style="margin:0;color:#1d1d1f;font-size:15px;line-height:1.7;">
          If you received this message, your email provider configuration is working and reminders can reach this inbox.
        </p>
      </div>`,
    cta: { label: "Open dashboard", href: `${getAppUrl()}/dashboard/settings/email` },
    footerNote: "You requested this test from Email Center.",
  });

  try {
    const result = await sendEmail({
      from: getFromEmail(),
      to: input.recipientEmail,
      subject: `[${APP_NAME}] Test email from Email Center`,
      html,
      tracking: {
        emailType: "TEST_EMAIL",
        organizationId: input.organizationId,
        userId: input.userId,
        metadata: { source: "email-center" },
      },
    });

    return { sent: true, messageId: result.id, provider: result.provider };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown email failure",
    };
  }
}

export async function sendVerificationEmail(input: {
  recipientEmail: string;
  organizationId: string;
  userId: string;
  organizationName?: string | null;
}) {
  const configurationError = getEmailProviderConfigurationError();
  if (configurationError) {
    return { sent: false, reason: configurationError };
  }

  const html = emailLayout({
    preheader: "Verify your Wathiqati notification email",
    eyebrow: "Verification",
    heading: "Notification email verified",
    intro: input.organizationName
      ? `This confirms that <strong>${input.recipientEmail}</strong> can receive ${APP_NAME} reminders for <strong>${input.organizationName}</strong>.`
      : `This confirms that <strong>${input.recipientEmail}</strong> can receive ${APP_NAME} reminders.`,
    contentHtml: `
      <div style="margin-top:24px;border:1px solid #e5e5ea;border-radius:20px;padding:20px;background:#f5f5f7;">
        <p style="margin:0;color:#1d1d1f;font-size:15px;line-height:1.7;">
          Daily digests, expiry reminders, and healthy-status reports will be delivered to this address when reminders are enabled.
        </p>
      </div>`,
    cta: { label: "Review Email Center", href: `${getAppUrl()}/dashboard/settings/email` },
    footerNote: "You requested this verification from Email Center.",
  });

  try {
    const result = await sendEmail({
      from: getFromEmail(),
      to: input.recipientEmail,
      subject: `[${APP_NAME}] Verify your notification email`,
      html,
      tracking: {
        emailType: "VERIFICATION",
        organizationId: input.organizationId,
        userId: input.userId,
        metadata: { source: "email-center" },
      },
    });

    return { sent: true, messageId: result.id, provider: result.provider };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown email failure",
    };
  }
}
