"use server";

import { auth, signOut } from "@/lib/auth";
import { sendAccountDeletedEmail } from "@/lib/email/send-account-deleted";
import { prisma } from "@/lib/prisma";

export type DeleteAccountActionState = {
  error?: string;
};

export async function deleteAccountAction(
  confirmation: string
): Promise<DeleteAccountActionState | undefined> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (confirmation !== "DELETE") {
    return { error: "Type DELETE to confirm account deletion." };
  }

  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: {
          select: {
            role: true,
            organizationId: true,
            organization: {
              select: {
                members: {
                  select: {
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return { error: "Account not found." };
    }

    const ownedOrganizationIds = user.memberships
      .filter((membership) => membership.role === "OWNER")
      .filter((membership) => {
        const ownerCount = membership.organization.members.filter(
          (member) => member.role === "OWNER"
        ).length;
        return ownerCount === 1;
      })
      .map((membership) => membership.organizationId);

    await prisma.$transaction(
      async (tx) => {
        if (ownedOrganizationIds.length > 0) {
          await tx.notificationLog.deleteMany({
            where: { organizationId: { in: ownedOrganizationIds } },
          });
          await tx.alertRead.deleteMany({
            where: { organizationId: { in: ownedOrganizationIds } },
          });
          await tx.document.deleteMany({
            where: { organizationId: { in: ownedOrganizationIds } },
          });
          await tx.importLog.deleteMany({
            where: { organizationId: { in: ownedOrganizationIds } },
          });
          await tx.company.deleteMany({
            where: { organizationId: { in: ownedOrganizationIds } },
          });
          await tx.organizationMember.deleteMany({
            where: { organizationId: { in: ownedOrganizationIds } },
          });
          await tx.organization.deleteMany({
            where: { id: { in: ownedOrganizationIds } },
          });
        }

        await tx.notificationLog.deleteMany({ where: { userId } });
        await tx.alertRead.deleteMany({ where: { userId } });
        await tx.organizationMember.deleteMany({ where: { userId } });
        await tx.account.deleteMany({ where: { userId } });
        await tx.session.deleteMany({ where: { userId } });
      },
      {
        timeout: 30000,
      }
    );

    const deletedAt = new Date();
    const emailResult = await sendAccountDeletedEmail({
      email: user.email,
      name: user.name,
      deletedAt,
    });

    if (!emailResult.sent) {
      console.error("Account deletion confirmation email failed", {
        userId,
        reason: emailResult.reason,
      });
    }

    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    console.error("Account deletion failed", {
      userId,
      step: "delete-account",
      error,
    });

    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete account. Please try again.",
    };
  }

  await signOut({ redirectTo: "/?accountDeleted=1" });
}
