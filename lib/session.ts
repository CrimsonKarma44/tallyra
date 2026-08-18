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
  isOrgAdmin: boolean;
};

export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session.userId || !session.username) {
    redirect("/login");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { organizationId: true },
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
  return {
    userId: session.userId,
    username: session.username,
    organizationId: user.organizationId,
    isOrgAdmin,
  };
}
