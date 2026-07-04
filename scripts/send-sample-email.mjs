import "dotenv/config";
import nodemailer from "nodemailer";
import { Resend } from "resend";

const appName = "Wathiqati";
const to = process.argv[2] ?? process.env.RESEND_TEST_TO;
const provider = process.env.EMAIL_PROVIDER === "gmail" ? "gmail" : "resend";
const from =
  provider === "gmail"
    ? `${appName} <${process.env.GMAIL_USER ?? "gmail-not-configured@example.com"}>`
    : process.env.RESEND_FROM_EMAIL ?? `${appName} <onboarding@resend.dev>`;
const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";

if (provider === "resend" && !process.env.RESEND_API_KEY) {
  console.error("Missing RESEND_API_KEY in .env");
  process.exit(1);
}

if (provider === "gmail" && (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)) {
  console.error("Gmail provider requires GMAIL_USER and GMAIL_APP_PASSWORD in .env");
  process.exit(1);
}

if (!to) {
  console.error("Usage: npm run email:test -- you@example.com");
  console.error("Or set RESEND_TEST_TO in .env");
  process.exit(1);
}

const message = {
  from,
  to,
  subject: `[${appName}] Sample reminder email`,
  html: `
    <div style="margin:0;background:#f5f5f7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e5ea;border-radius:28px;padding:32px;box-shadow:0 12px 40px rgba(0,0,0,0.08);">
        <p style="margin:0 0 12px;color:#86868b;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;">Sample reminder</p>
        <h1 style="margin:0;color:#1d1d1f;font-size:28px;line-height:1.2;">Document expiry alert</h1>
        <p style="margin:16px 0 0;color:#6e6e73;line-height:1.6;font-size:16px;">This is a development test email from ${appName}. Your Resend configuration is working if you received this message.</p>
        <div style="margin:28px 0;padding:20px;border-radius:20px;background:#f5f5f7;">
          <p style="margin:0;color:#1d1d1f;"><strong>Employee:</strong> Sample Employee</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Company:</strong> Sample Company</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Document:</strong> Compliance Certificate</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Number:</strong> SAMPLE-001</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Days remaining:</strong> 7</p>
          <p style="margin:10px 0 0;color:#1d1d1f;"><strong>Status:</strong> URGENT</p>
        </div>
        <a href="${appUrl}/dashboard/reminders" style="display:inline-block;background:#1d1d1f;color:white;text-decoration:none;padding:13px 18px;border-radius:999px;font-weight:600;">Open ${appName}</a>
        <p style="margin:28px 0 0;color:#86868b;font-size:12px;line-height:1.5;">This command does not create fake documents or write reminder logs.</p>
      </div>
    </div>
  `,
};

let id = "unknown";

if (provider === "gmail") {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  const result = await transporter.sendMail(message);
  id = result.messageId ?? "unknown";
} else {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send(message);

  if (result.error) {
    console.error("Resend error:", result.error);
    process.exit(1);
  }

  id = result.data?.id ?? "unknown";
}

console.log("Sample email sent successfully.");
console.log("Provider:", provider);
console.log("Message id:", id);
