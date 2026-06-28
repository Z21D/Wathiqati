import { prisma } from "@/lib/prisma";

export async function getOrganizationForUser(userId: string) {
  return prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
  });
}
