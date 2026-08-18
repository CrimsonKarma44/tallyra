import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionOptions, type SessionData } from "@/lib/session-options";

export type { SessionData } from "@/lib/session-options";
export { getSessionOptions, SESSION_COOKIE } from "@/lib/session-options";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function requireUser() {
  const session = await getSession();
  if (!session.userId || !session.username) {
    redirect("/login");
  }
  return { userId: session.userId, username: session.username };
}
