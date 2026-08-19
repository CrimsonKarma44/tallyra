import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function deletePersonalAccount(userId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { createdById: userId } });
    await tx.expense.deleteMany({ where: { createdById: userId } });
    await tx.authToken.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}

async function reassignRecords(tx: Prisma.TransactionClient, fromUserId: string, toUserId: string) {
  await tx.transaction.updateMany({ where: { createdById: fromUserId }, data: { createdById: toUserId } });
  await tx.expense.updateMany({ where: { createdById: fromUserId }, data: { createdById: toUserId } });
}

export async function removeOrgMember(orgId: string, memberId: string, adminId: string) {
  if (memberId === adminId) {
    throw new Error("The admin cannot be removed this way.");
  }
  await prisma.$transaction(async (tx) => {
    const member = await tx.user.findFirst({
      where: { id: memberId, organizationId: orgId },
      select: { id: true },
    });
    if (!member) {
      throw new Error("Member not found in this organization.");
    }
    await reassignRecords(tx, memberId, adminId);
    await tx.authToken.deleteMany({ where: { userId: memberId } });
    await tx.user.delete({ where: { id: memberId } });
  });
}

export async function transferOrgAdmin(orgId: string, successorId: string) {
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: { adminId: true, members: { select: { id: true } } },
    });
    if (!org) {
      throw new Error("Organization not found.");
    }
    if (!org.members.some((m) => m.id === successorId)) {
      throw new Error("The new admin must be a member of the organization.");
    }
    await tx.organization.update({
      where: { id: orgId },
      data: { adminId: successorId },
    });
  });
}

/** Delete an organization that has no members. The admin account stays. */
export async function deleteOrgOnly(orgId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: { _count: { select: { members: true } } },
    });
    if (!org) {
      throw new Error("Organization not found.");
    }
    if (org._count.members > 0) {
      throw new Error("Remove the organization's members first.");
    }
    await tx.organization.delete({ where: { id: orgId } });
  });
}

export async function deleteOrgWithAdmin(orgId: string, adminId: string) {
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: { adminId: true, members: { select: { id: true } } },
    });
    if (!org) {
      throw new Error("Organization not found.");
    }
    if (org.adminId !== adminId || org.members.some((m) => m.id !== adminId)) {
      throw new Error("Organization must be deleted from the admin account when it has no other members.");
    }
    await tx.transaction.deleteMany({ where: { createdById: adminId } });
    await tx.expense.deleteMany({ where: { createdById: adminId } });
    await tx.authToken.deleteMany({ where: { userId: adminId } });
    await tx.user.update({ where: { id: adminId }, data: { organizationId: null } });
    await tx.organization.delete({ where: { id: orgId } });
    await tx.user.delete({ where: { id: adminId } });
  });
}