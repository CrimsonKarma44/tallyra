import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionOptions, type SessionData } from "@/lib/session-options";

export type { SessionData } from "@/lib/session-options";
export { getSessionOptions, SESSION_COOKIE } from "@/lib/session-options";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export type CurrentUser = {
  userId: string;
  username: string;
  organizationId: string | null;
  createdByOrgId: string | null;
  isOrgAdmin: boolean;
  ledgerContext: "personal" | "org";
  activeOrgId: string | null;
  emailVerifiedAt: Date | null;
};

export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session.userId || !session.username) {
    redirect("/login");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      organizationId: true,
      createdByOrgId: true,
      emailVerifiedAt: true,
    },
  });
  if (!user) {
    redirect("/login");
  }
  let isOrgAdmin = false;
  if (user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { adminId: true },
    });
    isOrgAdmin = org?.adminId === session.userId;
  }
  const ledgerContext: "personal" | "org" =
    session.ledgerContext === "personal" ? "personal" : "org";
  return {
    userId: session.userId,
    username: session.username,
    organizationId: user.organizationId,
    createdByOrgId: user.createdByOrgId,
    isOrgAdmin,
    ledgerContext,
    activeOrgId: ledgerContext === "personal" ? null : user.organizationId,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

/**
 * Require a signed-in user with access to a ledger. Organization accounts must
 * verify their email before using the shared ledger; personal accounts are
 * never blocked (they only see a banner).
 */
export async function requireVerifiedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.organizationId && !user.emailVerifiedAt) {
    redirect("/verify-email");
  }
  return user;
}
