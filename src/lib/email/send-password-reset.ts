import {
  APP_NAME,
  getAppUrl,
  getEmailProviderConfigurationError,
  getFromEmail,
  sendEmail,
} from "@/lib/email/client";
import { buildPasswordResetUrl } from "@/lib/password-reset";
import { emailLayout } from "@/lib/email/templates";

export async function sendPasswordResetEmail(input: {
  email: string;
  name?: string | null;
  rawToken: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const configurationError = getEmailProviderConfigurationError();
  if (configurationError) {
    return { sent: false, reason: configurationError };
  }

  const firstName = input.name?.trim().split(/\s+/)[0] || "there";
  const resetUrl = buildPasswordResetUrl(input.rawToken, getAppUrl());

  const contentHtml = `
    <div style="margin-top:24px;border:1px solid #e5e5ea;border-radius:20px;padding:20px;background:#f5f5f7;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#86868b;">Security notice</p>
      <p style="margin:0;color:#1d1d1f;font-size:15px;line-height:1.7;">
        This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email — your password will stay the same.
      </p>
    </div>`;

  const html = emailLayout({
    preheader: `Reset your ${APP_NAME} password.`,
    eyebrow: "Password reset",
    heading: `Reset your password, ${firstName}`,
    intro: `We received a request to reset the password for your ${APP_NAME} account. Use the button below to choose a new password.`,
    contentHtml,
    cta: { label: "Reset password", href: resetUrl },
    footerNote: `You are receiving this because a password reset was requested for your ${APP_NAME} account.`,
  });

  try {
    const result = await sendEmail({
      from: getFromEmail(),
      to: input.email,
      subject: `Reset your ${APP_NAME} password`,
      html,
    });

    console.info("Password reset email sent", {
      email: input.email,
      messageId: result.id,
      provider: result.provider,
    });

    return { sent: true };
  } catch (error) {
    console.error("Password reset email failed", {
      email: input.email,
      error,
    });
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown email failure",
    };
  }
}
