import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";

export class EmailCenterAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailCenterAccessError";
  }
}

export async function requireEmailCenterAccess() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new EmailCenterAccessError("Unauthorized");
  }

  const membership = await getOrganizationForUser(session.user.id);

  if (!membership) {
    throw new EmailCenterAccessError("No workspace found");
  }

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new EmailCenterAccessError(
      "Only workspace owners and admins can access Email Center"
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      notificationEmail: true,
      emailRemindersEnabled: true,
      reminderSchedule: true,
      expiredReminderFrequency: true,
      healthyReportFrequency: true,
      companyName: true,
    },
  });

  if (!user) {
    throw new EmailCenterAccessError("User not found");
  }

  return {
    session,
    membership,
    user,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    notificationEmail: user.notificationEmail || user.email,
  };
}
