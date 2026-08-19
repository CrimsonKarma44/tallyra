import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { emailVerifiedAtForNewAccount } from "@/lib/auth";
import { isMailConfigured } from "@/lib/mail";

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
      emailVerifiedAt: true,
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

/**
 * Whether a newly created organization's email counts as verified at creation.
 * Without SMTP every email is treated as verified. A "same email" org (the
 * admin's own address) inherits the admin's verification; any other email
 * starts unverified and needs its own code.
 */
export function initialOrgEmailVerifiedAt(opts: {
  smtpConfigured: boolean;
  orgEmail: string | null;
  adminEmail: string | null;
  adminVerifiedAt: Date | null;
}): Date | null {
  if (!opts.smtpConfigured) {
    return new Date();
  }
  if (opts.orgEmail && opts.orgEmail === opts.adminEmail) {
    return opts.adminVerifiedAt;
  }
  return null;
}

export async function createOrganizationForExistingUser(
  orgName: string,
  orgEmail: string | null,
  adminUserId: string,
): Promise<OrgResult<{ orgId: string; emailVerifiedAt: Date | null }>> {
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { email: true, emailVerifiedAt: true },
  });
  if (!admin) {
    return { ok: false, error: "Account not found." };
  }
  const emailVerifiedAt = initialOrgEmailVerifiedAt({
    smtpConfigured: isMailConfigured(),
    orgEmail,
    adminEmail: admin.email,
    adminVerifiedAt: admin.emailVerifiedAt,
  });
  try {
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        email: orgEmail || null,
        adminId: adminUserId,
        emailVerifiedAt,
      },
      select: { id: true },
    });
    return { ok: true, data: { orgId: org.id, emailVerifiedAt } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      if (target.includes("Organization_email_key")) {
        return { ok: false, error: "That email is already in use by another organization." };
      }
      return { ok: false, error: "That organization name is already taken." };
    }
    throw error;
  }
}

export type UserOrganization = {
  id: string;
  name: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  adminId: string;
  memberCount: number;
  isAdmin: boolean;
  isMember: boolean;
};

export async function getUserOrganizations(
  userId: string,
  userEmail: string | null,
  organizationId: string | null,
): Promise<UserOrganization[]> {
  const orgs = await prisma.organization.findMany({
    where: userEmail
      ? { OR: [{ adminId: userId }, { email: userEmail }] }
      : { adminId: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      adminId: true,
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    email: org.email,
    emailVerifiedAt: org.emailVerifiedAt,
    adminId: org.adminId,
    memberCount: org._count.members,
    isAdmin: org.adminId === userId,
    isMember: org.id === organizationId,
  }));
}

export async function joinOrganization(
  orgId: string,
  adminUserId: string,
): Promise<OrgResult<{ name: string }>> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { adminId: true, name: true },
  });
  if (!org) {
    return { ok: false, error: "Organization not found." };
  }
  if (org.adminId !== adminUserId) {
    return { ok: false, error: "Only the organization's admin can join it this way." };
  }
  const user = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { organizationId: true },
  });
  if (user?.organizationId) {
    return { ok: false, error: "You already belong to an organization." };
  }
  await prisma.user.update({
    where: { id: adminUserId },
    data: { organizationId: orgId },
  });
  return { ok: true, data: { name: org.name } };
}