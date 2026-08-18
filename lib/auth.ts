import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isMailConfigured } from "@/lib/mail";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const ORG_NAME_PATTERN = /^[a-zA-Z0-9 ._-]{3,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeUsername(raw: string): string {
  return raw.trim();
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Email is required.";
  }
  if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return "Username is required.";
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Username must be 3–32 characters: letters, numbers, dots, hyphens, or underscores.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export function validateDisplayName(displayName: string): string | null {
  if (displayName.length > 40) {
    return "Display name must be 40 characters or fewer.";
  }
  return null;
}

export function validateOrgName(orgName: string): string | null {
  if (!orgName) {
    return "Organization name is required.";
  }
  if (!ORG_NAME_PATTERN.test(orgName)) {
    return "Organization name must be 3–40 characters: letters, numbers, spaces, dots, hyphens, or underscores.";
  }
  return null;
}

export async function verifyCredentials(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, organizationId: true, passwordHash: true },
  });
  if (!user) {
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return null;
  }
  return user;
}

/** When SMTP is not configured, new accounts are auto-verified and no emails are sent. */
export function emailVerifiedAtForNewAccount(): Date | null {
  return isMailConfigured() ? null : new Date();
}

export async function createUser(username: string, password: string, email: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const existingPersonal = await prisma.user.findFirst({
    where: { email, organizationId: null },
    select: { id: true },
  });
  if (existingPersonal) {
    return { ok: false as const, error: "That email already has a personal account." };
  }
  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        email,
        emailVerifiedAt: emailVerifiedAtForNewAccount(),
      },
      select: { id: true, username: true },
    });
    return { ok: true as const, user };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, error: "That username is already taken." };
    }
    throw error;
  }
}
