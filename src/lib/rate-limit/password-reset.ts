import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const EMAIL_LIMIT = 3;
const IP_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function isPasswordResetRateLimited(input: {
  email: string;
  ipAddress?: string | null;
}) {
  const since = new Date(Date.now() - WINDOW_MS);
  const emailIdentifier = `email:${hashIdentifier(input.email.toLowerCase())}`;
  const identifiers = [emailIdentifier];

  if (input.ipAddress) {
    identifiers.push(`ip:${hashIdentifier(input.ipAddress)}`);
  }

  const counts = await Promise.all(
    identifiers.map(async (identifier) => {
      const count = await prisma.passwordResetRateLimit.count({
        where: {
          identifier,
          createdAt: { gte: since },
        },
      });

      return { identifier, count };
    })
  );

  const emailCount = counts.find((entry) =>
    entry.identifier.startsWith("email:")
  );
  const ipCount = counts.find((entry) => entry.identifier.startsWith("ip:"));

  if (emailCount && emailCount.count >= EMAIL_LIMIT) {
    return true;
  }

  if (ipCount && ipCount.count >= IP_LIMIT) {
    return true;
  }

  return false;
}

export async function recordPasswordResetAttempt(input: {
  email: string;
  ipAddress?: string | null;
}) {
  const entries = [
    {
      identifier: `email:${hashIdentifier(input.email.toLowerCase())}`,
    },
  ];

  if (input.ipAddress) {
    entries.push({
      identifier: `ip:${hashIdentifier(input.ipAddress)}`,
    });
  }

  await prisma.passwordResetRateLimit.createMany({
    data: entries,
  });
}
