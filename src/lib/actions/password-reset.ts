"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  generatePasswordResetToken,
  getPasswordResetExpiryDate,
  getResetTokenErrorMessage,
} from "@/lib/password-reset";
import { findValidPasswordResetToken } from "@/lib/password-reset-token";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";
import {
  isPasswordResetRateLimited,
  recordPasswordResetAttempt,
} from "@/lib/rate-limit/password-reset";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/password";
import {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  type PasswordResetActionState,
} from "@/lib/password-reset-constants";

function getClientIp(headerStore: Headers) {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    null
  );
}

export async function requestPasswordResetAction(
  _prevState: PasswordResetActionState,
  formData: FormData
): Promise<PasswordResetActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const headerStore = await headers();
  const ipAddress = getClientIp(headerStore);
  const normalizedEmail = parsed.data.email.toLowerCase();

  const rateLimited = await isPasswordResetRateLimited({
    email: normalizedEmail,
    ipAddress,
  });

  await recordPasswordResetAttempt({
    email: normalizedEmail,
    ipAddress,
  });

  if (rateLimited) {
    return { success: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
    },
  });

  if (!user?.password) {
    return { success: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  const { rawToken, tokenHash } = generatePasswordResetToken();

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: getPasswordResetExpiryDate(),
      },
    }),
  ]);

  const emailResult = await sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    rawToken,
  });

  if (!emailResult.sent) {
    console.error("Password reset email could not be sent", {
      email: user.email,
      reason: emailResult.reason,
    });
  }

  return { success: PASSWORD_RESET_SUCCESS_MESSAGE };
}

export async function resetPasswordAction(
  _prevState: PasswordResetActionState,
  formData: FormData
): Promise<PasswordResetActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tokenRecord = await findValidPasswordResetToken(parsed.data.token);
  if (!tokenRecord) {
    return { error: getResetTokenErrorMessage("invalid") };
  }

  if (tokenRecord.usedAt) {
    return { error: getResetTokenErrorMessage("used") };
  }

  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    return { error: getResetTokenErrorMessage("expired") };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: tokenRecord.userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    }),
    prisma.session.deleteMany({
      where: { userId: tokenRecord.userId },
    }),
  ]);

  return {
    success: "Your password has been updated. You can sign in with your new password.",
  };
}
