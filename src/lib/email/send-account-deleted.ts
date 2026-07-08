import {
  APP_NAME,
  getEmailProviderConfigurationError,
  getFromEmail,
  sendEmail,
} from "@/lib/email/client";
import { emailLayout } from "@/lib/email/templates";

export async function sendAccountDeletedEmail(input: {
  email: string;
  name?: string | null;
  deletedAt: Date;
}): Promise<{ sent: boolean; reason?: string }> {
  const configurationError = getEmailProviderConfigurationError();
  if (configurationError) {
    return { sent: false, reason: configurationError };
  }

  const supportEmail = process.env.SUPPORT_EMAIL ?? "support@wathiqati.com";
  const deletedAtLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "UTC",
  }).format(input.deletedAt);
  const greetingName = input.name?.trim().split(/\s+/)[0] || "there";

  const html = emailLayout({
    preheader: `Your ${APP_NAME} account has been permanently deleted.`,
    eyebrow: "Account deleted",
    heading: `Your ${APP_NAME} account has been deleted`,
    intro: `Hi ${greetingName}, this email confirms that your ${APP_NAME} account was permanently deleted.`,
    contentHtml: `
      <div style="margin-top:24px;border:1px solid #e5e5ea;border-radius:20px;padding:20px;background:#f5f5f7;">
        <p style="margin:0;color:#1d1d1f;font-size:15px;line-height:1.7;">
          <strong>Deletion timestamp:</strong><br/>
          ${deletedAtLabel} (UTC)
        </p>
        <p style="margin:16px 0 0;color:#6e6e73;font-size:15px;line-height:1.7;">
          Thank you for using ${APP_NAME}. We appreciate the trust you placed in us to manage your document compliance.
        </p>
      </div>
      <div style="margin-top:18px;border:1px solid #fee4e2;border-radius:20px;padding:20px;background:#fef3f2;">
        <p style="margin:0;color:#912018;font-size:15px;line-height:1.7;">
          If this deletion was accidental, contact support immediately at
          <a href="mailto:${supportEmail}" style="color:#b42318;font-weight:700;text-decoration:none;">${supportEmail}</a>.
        </p>
      </div>
    `,
    footerNote: `This is the final confirmation email for your deleted ${APP_NAME} account.`,
  });

  try {
    await sendEmail({
      from: getFromEmail(),
      to: input.email,
      subject: `Your ${APP_NAME} account has been deleted`,
      html,
      tracking: {
        emailType: "ACCOUNT_DELETED",
        metadata: { deletedAt: input.deletedAt.toISOString() },
      },
    });

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown email failure",
    };
  }
}
