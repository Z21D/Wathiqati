import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/password-reset";

export type ResetTokenValidation =
  | { valid: true }
  | { valid: false; reason: "missing" | "invalid" | "expired" | "used" };

export async function validateResetToken(
  rawToken: string | undefined
): Promise<ResetTokenValidation> {
  if (!rawToken?.trim()) {
    return { valid: false, reason: "missing" };
  }

  const tokenHash = hashPasswordResetToken(rawToken);
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!tokenRecord) {
    return { valid: false, reason: "invalid" };
  }

  if (tokenRecord.usedAt) {
    return { valid: false, reason: "used" };
  }

  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true };
}

export async function findValidPasswordResetToken(rawToken: string) {
  const tokenHash = hashPasswordResetToken(rawToken);
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });
}
