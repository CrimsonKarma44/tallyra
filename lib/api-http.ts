import { NextResponse } from "next/server";
import { verifyApiToken } from "@/lib/api-token";
import { prisma } from "@/lib/prisma";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export function options() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function requireApiUser(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    return { error: json({ error: "Missing bearer token." }, 401) };
  }
  const payload = verifyApiToken(token);
  if (!payload) {
    return { error: json({ error: "Invalid or expired token." }, 401) };
  }
  return { user: { userId: payload.sub, username: payload.username } };
}

/**
 * Same as requireApiUser, but organization accounts must have a verified email
 * before they can read or write the ledger through the API. Personal accounts
 * are never blocked.
 */
export async function requireApiLedgerUser(request: Request) {
  const auth = requireApiUser(request);
  if ("error" in auth) {
    return auth;
  }
  const user = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: { organizationId: true, emailVerifiedAt: true },
  });
  if (user?.organizationId && !user.emailVerifiedAt) {
    return { error: json({ error: "Email not verified." }, 403) };
  }
  return auth;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export type LedgerDecisionUser = {
  id: string;
  organizationId: string | null;
  organizationAdminId?: string | null;
};

/**
 * Pure decision for the ?ledger= query param on ledger read endpoints.
 * Returns the LedgerContextOptions to pass to the service layer, or an error
 * string for invalid or disallowed combinations.
 */
export function ledgerParamDecision(
  param: string | null,
  user: LedgerDecisionUser,
): { opts: { activeOrgId?: string | null }; error?: string } {
  if (!param) {
    return { opts: {} };
  }
  if (param === "org") {
    if (!user.organizationId) {
      return { opts: {}, error: "This account has no organization." };
    }
    return { opts: { activeOrgId: user.organizationId } };
  }
  if (param === "personal") {
    const isAdmin = Boolean(user.organizationId && user.organizationAdminId === user.id);
    if (user.organizationId && !isAdmin) {
      return { opts: {}, error: "Only the organization admin has a personal ledger." };
    }
    return { opts: { activeOrgId: null } };
  }
  return { opts: {}, error: "Invalid ledger value. Use 'org' or 'personal'." };
}

/**
 * Resolves the ?ledger= query param against the caller's account, returning
 * LedgerContextOptions for the service layer or a 400 response on error.
 */
export async function resolveLedgerScope(userId: string, param: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      organizationId: true,
      organization: { select: { adminId: true } },
    },
  });
  const record: LedgerDecisionUser = {
    id: userId,
    organizationId: user?.organizationId ?? null,
    organizationAdminId: user?.organization?.adminId ?? null,
  };
  const decision = ledgerParamDecision(param, record);
  if (decision.error) {
    return { error: json({ error: decision.error }, 400) };
  }
  return { opts: decision.opts };
}
