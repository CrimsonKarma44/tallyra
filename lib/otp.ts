import { createHash, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const RESET_TTL_MS = 15 * 60 * 1000;
export const VERIFY_TTL_MS = 60 * 60 * 1000;
export const MAX_ATTEMPTS = 5;

export const AUTH_KIND = {
  passwordReset: "password-reset",
  emailVerification: "email-verification",
  orgEmailVerification: "org-email-verification",
} as const;

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtp(code: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createAuthToken(userId: string, kind: string, ttlMs: number) {
  await prisma.authToken.deleteMany({ where: { userId, kind } });
  const code = generateOtp();
  await prisma.authToken.create({
    data: {
      userId,
      kind,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return code;
}

export type ConsumeResult = { ok: true } | { ok: false; error: string };

export async function consumeAuthToken(userId: string, kind: string, code: string): Promise<ConsumeResult> {
  const token = await prisma.authToken.findFirst({
    where: { userId, kind, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!token || token.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "That code is invalid or has expired. Request a new one." };
  }
  if (!verifyOtp(code.trim(), token.codeHash)) {
    const attempts = token.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date(), attempts } });
      return { ok: false, error: "Too many incorrect attempts. Request a new code." };
    }
    await prisma.authToken.update({ where: { id: token.id }, data: { attempts } });
    return { ok: false, error: "That code is incorrect." };
  }
  await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return { ok: true };
}