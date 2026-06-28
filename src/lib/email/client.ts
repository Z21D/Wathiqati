import { Resend } from "resend";
import { APP_NAME } from "@/lib/brand";

let resendClient: Resend | null = null;

export function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? "ExpiryGuard <onboarding@resend.dev>";
}

export function getAppUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export { APP_NAME };
