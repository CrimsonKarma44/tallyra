import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim();
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

export async function verifyCredentials(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return null;
  }
  return { id: user.id, username: user.username };
}

export async function createUser(username: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { username, passwordHash },
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
