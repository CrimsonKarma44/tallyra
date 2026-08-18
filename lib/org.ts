import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { emailVerifiedAtForNewAccount } from "@/lib/auth";

export type OrgResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createOrganizationWithAdmin(
  orgName: string,
  orgEmail: string,
  username: string,
  email: string,
  password: string,
): Promise<OrgResult<{ userId: string }>> {
  const passwordHash = await bcrypt.hash(password, 10);
  const verifiedAt = emailVerifiedAtForNewAccount();
  try {
    const org = await prisma.$transaction(async (tx) => {
      const admin = await tx.user.create({
        data: { username, passwordHash, email, emailVerifiedAt: verifiedAt },
        select: { id: true },
      });
      const createdOrg = await tx.organization.create({
        data: { name: orgName, email: orgEmail || null, adminId: admin.id },
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
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      if (target.includes("Organization_email_key")) {
        return { ok: false, error: "That company email is already in use by another organization." };
      }
      return { ok: false, error: "That organization name is already taken." };
    }
    throw error;
  }
}

export async function addOrgMember(
  orgId: string,
  username: string,
  email: string,
  password: string,
): Promise<OrgResult<{ userId: string; username: string }>> {
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const member = await prisma.user.create({
      data: {
        username,
        passwordHash,
        email,
        emailVerifiedAt: emailVerifiedAtForNewAccount(),
        organizationId: orgId,
      },
      select: { id: true, username: true },
    });
    return { ok: true, data: { userId: member.id, username: member.username } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      if (target.includes("User_organizationId_email_key")) {
        return { ok: false, error: "That email is already used in this organization." };
      }
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
      email: true,
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