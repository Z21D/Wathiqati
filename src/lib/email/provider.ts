import nodemailer from "nodemailer";
import { Resend } from "resend";
import { APP_NAME } from "@/lib/brand";

export type EmailProvider = "resend" | "gmail";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

export type SendEmailResult = {
  id?: string;
  provider: EmailProvider;
};

let resendClient: Resend | null = null;
let gmailTransporter: nodemailer.Transporter | null = null;

export function getActiveEmailProvider(): EmailProvider {
  return process.env.EMAIL_PROVIDER === "gmail" ? "gmail" : "resend";
}

export function getFromEmail(provider: EmailProvider = getActiveEmailProvider()) {
  if (provider === "gmail") {
    return process.env.GMAIL_USER
      ? `${APP_NAME} <${process.env.GMAIL_USER}>`
      : `${APP_NAME} <gmail-not-configured@example.com>`;
  }

  return process.env.RESEND_FROM_EMAIL ?? `${APP_NAME} <onboarding@resend.dev>`;
}

export function getAppUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export function isEmailProviderConfigured() {
  const provider = getActiveEmailProvider();

  if (provider === "gmail") {
    return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  }

  return Boolean(process.env.RESEND_API_KEY);
}

export function getEmailProviderConfigurationError() {
  const provider = getActiveEmailProvider();

  if (provider === "gmail") {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return "Gmail provider requires GMAIL_USER and GMAIL_APP_PASSWORD";
    }
    return null;
  }

  if (!process.env.RESEND_API_KEY) {
    return "RESEND_API_KEY not configured";
  }

  return null;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = getActiveEmailProvider();

  if (provider === "gmail") {
    return sendWithGmail(input);
  }

  return sendWithResend(input);
}

async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  const result = await resendClient.emails.send({
    from: input.from ?? getFromEmail("resend"),
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    id: result.data?.id,
    provider: "resend",
  };
}

async function sendWithGmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail provider requires GMAIL_USER and GMAIL_APP_PASSWORD");
  }

  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  const result = await gmailTransporter.sendMail({
    from: input.from ?? getFromEmail("gmail"),
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return {
    id: result.messageId,
    provider: "gmail",
  };
}

export { APP_NAME };
