"use server";

import { redirect } from "next/navigation";
import {
  createUser,
  normalizeUsername,
  validatePassword,
  validateUsername,
  verifyCredentials,
} from "@/lib/auth";
import { getSession } from "@/lib/session";

export type AuthState = { error?: string } | null;

function safeNextPath(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

async function establishSession(user: { id: string; username: string }, nextPath: string) {
  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  await session.save();
  redirect(safeNextPath(nextPath));
}

export async function loginAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "").trim();

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return { error: "Invalid username or password." };
  }

  await establishSession(user, nextPath);
  return null;
}

export async function signupAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const nextPath = String(formData.get("next") ?? "").trim();

  const usernameError = validateUsername(username);
  if (usernameError) {
    return { error: usernameError };
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const created = await createUser(username, password);
  if (!created.ok) {
    return { error: created.error };
  }

  await establishSession(created.user, nextPath);
  return null;
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
