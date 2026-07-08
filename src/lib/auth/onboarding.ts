import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.organization.findUnique({
      where: { slug: candidate },
    });
    if (!existing) return candidate;
    suffix++;
  }
}

export function deriveOrganizationName(input: {
  name?: string | null;
  email: string;
}) {
  const trimmedName = input.name?.trim();
  if (trimmedName) {
    return `${trimmedName}'s Workspace`;
  }

  const localPart = input.email.split("@")[0]?.trim();
  if (localPart) {
    const formatted = localPart.replace(/[._-]+/g, " ").trim();
    const titleCase = formatted
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return titleCase ? `${titleCase}'s Workspace` : "My Workspace";
  }

  return "My Workspace";
}

export async function provisionUserWorkspace(input: {
  userId: string;
  name?: string | null;
  email: string;
  organizationName: string;
}) {
  const normalizedEmail = input.email.toLowerCase();
  const slug = await uniqueSlug(input.organizationName);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: {
        companyName: input.organizationName,
        notificationEmail: normalizedEmail,
        emailRemindersEnabled: true,
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: input.organizationName,
        slug,
      },
    });

    await tx.organizationMember.create({
      data: {
        userId: input.userId,
        organizationId: organization.id,
        role: "OWNER",
      },
    });
  });

  return { organizationName: input.organizationName, slug };
}

export async function sendWelcomeEmailOnce(input: {
  userId: string;
  name?: string | null;
  email: string;
  organizationName: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { welcomeEmailSentAt: true },
  });

  if (user?.welcomeEmailSentAt) {
    return;
  }

  try {
    const result = await sendWelcomeEmail({
      name: input.name,
      email: input.email.toLowerCase(),
      organizationName: input.organizationName,
    });

    if (result.sent) {
      await prisma.user.update({
        where: { id: input.userId },
        data: { welcomeEmailSentAt: new Date() },
      });
    }
  } catch (error) {
    console.error("Welcome email dispatch failed", error);
  }
}

export async function provisionOAuthUserIfNeeded(user: {
  id: string;
  name?: string | null;
  email?: string | null;
}) {
  if (!user.email) {
    return;
  }

  const membershipCount = await prisma.organizationMember.count({
    where: { userId: user.id },
  });

  if (membershipCount > 0) {
    return;
  }

  const organizationName = deriveOrganizationName({
    name: user.name,
    email: user.email,
  });

  await provisionUserWorkspace({
    userId: user.id,
    name: user.name,
    email: user.email,
    organizationName,
  });

  await sendWelcomeEmailOnce({
    userId: user.id,
    name: user.name,
    email: user.email,
    organizationName,
  });
}
