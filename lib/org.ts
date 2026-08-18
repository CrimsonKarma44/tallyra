import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type OrgResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createOrganizationWithAdmin(
  orgName: string,
  username: string,
  password: string,
): Promise<OrgResult<{ userId: string }>> {
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const org = await prisma.$transaction(async (tx) => {
      const admin = await tx.user.create({
        data: { username, passwordHash },
        select: { id: true },
      });
      const createdOrg = await tx.organization.create({
        data: { name: orgName, adminId: admin.id },
      });
      await tx.user.update({
        where: { id: admin.id },
        data: { organizationId: createdOrg.id },
      });
      return { userId: admin.id };
    });
    return { ok: true, data: org };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "That organization name is already taken." };
    }
    throw error;
  }
}

export async function addOrgMember(
  orgId: string,
  username: string,
  password: string,
): Promise<OrgResult<{ userId: string; username: string }>> {
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const member = await prisma.user.create({
      data: { username, passwordHash, organizationId: orgId },
      select: { id: true, username: true },
    });
    return { ok: true, data: { userId: member.id, username: member.username } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "That username is already taken." };
    }
    throw error;
  }
}

export async function getOrgDetails(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      adminId: true,
      members: {
        select: {
          id: true,
          username: true,
          displayName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}