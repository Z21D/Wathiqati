import { createHash, randomBytes } from "crypto";

const TOKEN_BYTES = 32;
export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

export function generatePasswordResetToken() {
  const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    rawToken,
    tokenHash: hashPasswordResetToken(rawToken),
  };
}

export function hashPasswordResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function getPasswordResetExpiryDate(now: Date = new Date()) {
  return new Date(now.getTime() + PASSWORD_RESET_EXPIRY_MS);
}

export function buildPasswordResetUrl(rawToken: string, appUrl: string) {
  const url = new URL("/reset-password", appUrl);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export function getResetTokenErrorMessage(
  reason: "missing" | "invalid" | "expired" | "used"
) {
  switch (reason) {
    case "missing":
    case "invalid":
      return "This password reset link is invalid. Please request a new one.";
    case "expired":
      return "This password reset link has expired. Please request a new one.";
    case "used":
      return "This password reset link has already been used. Please request a new one.";
    default:
      return "This password reset link is invalid. Please request a new one.";
  }
}
