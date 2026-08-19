"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  createUser,
  normalizeUsername,
  validateEmail,
  validateOrgName,
  validatePassword,
  validateUsername,
  verifyCredentials,
} from "@/lib/auth";
import { createOrganizationWithAdmin } from "@/lib/org";
import { getSession, requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { AUTH_KIND, RESET_TTL_MS, VERIFY_TTL_MS, consumeAuthToken, createAuthToken } from "@/lib/otp";
import { memberLoginAlertEmail, passwordResetEmail, verifyEmailEmail } from "@/lib/mail-templates";

export type AuthState = { error?: string } | null;
export type OtpState = { error?: string; success?: string; identity?: string } | null;

function safeNextPath(raw: string): string {
  if (raw.startsWith("/") && !raw.startsWith("//") && raw !== "/") {
    return raw;
  }
  return "/sales";
}

async function establishSession(user: { id: string; username: string }, nextPath: string) {
  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  await session.save();
  redirect(safeNextPath(nextPath));
}

async function sendVerificationEmail(userId: string, username: string, email: string) {
  if (!isMailConfigured()) {
    return;
  }
  try {
    const code = await createAuthToken(userId, AUTH_KIND.emailVerification, VERIFY_TTL_MS);
    const mail = verifyEmailEmail({ username, code, expiresInMinutes: VERIFY_TTL_MS / 60000 });
    await sendMail({ to: email, ...mail });
  } catch {
    // Email failures never block account creation.
  }
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

  if (user.organizationId && isMailConfigured()) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { email: true, name: true },
    });
    if (org?.email) {
      const mail = memberLoginAlertEmail({
        orgName: org.name,
        username: user.username,
        at: new Date().toLocaleString("en-PH"),
      });
      void sendMail({ to: org.email, ...mail }).catch(() => {});
    }
  }

  await establishSession({ id: user.id, username: user.username }, nextPath);
  return null;
}

export async function signupAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const accountType = String(formData.get("accountType") ?? "solo");
  const orgName = String(formData.get("orgName") ?? "").trim();
  const orgEmail = String(formData.get("orgEmail") ?? "").trim();
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
  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }

  const needsVerification = isMailConfigured();

  if (accountType === "create-org") {
    const orgNameError = validateOrgName(orgName);
    if (orgNameError) {
      return { error: orgNameError };
    }
    const orgEmailError = validateEmail(orgEmail);
    if (orgEmailError) {
      return { error: `Company email: ${orgEmailError.toLowerCase()}` };
    }
    const created = await createOrganizationWithAdmin(orgName, orgEmail, username, email, password);
    if (!created.ok) {
      return { error: created.error };
    }
    await sendVerificationEmail(created.data.userId, username, email);
    await establishSession({ id: created.data.userId, username }, needsVerification ? "/verify-email" : nextPath);
    return null;
  }

  const created = await createUser(username, password, email);
  if (!created.ok) {
    return { error: created.error };
  }

  await sendVerificationEmail(created.user.id, username, email);
  await establishSession(created.user, needsVerification ? "/verify-email" : nextPath);
  return null;
}

export async function requestPasswordResetAction(
  prevState: OtpState,
  formData: FormData,
): Promise<OtpState> {
  const identity = String(formData.get("identity") ?? "").trim();
  if (!identity) {
    return { error: "Enter your username or email." };
  }
  if (!isMailConfigured()) {
    return { error: "Password reset email is not configured on this server." };
  }
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identity }, { email: identity }],
      emailVerifiedAt: { not: null },
    },
    select: { id: true, username: true, email: true },
  });
  if (user?.email) {
    try {
      const code = await createAuthToken(user.id, AUTH_KIND.passwordReset, RESET_TTL_MS);
      const mail = passwordResetEmail({
        username: user.username,
        code,
        expiresInMinutes: RESET_TTL_MS / 60000,
      });
      await sendMail({ to: user.email, ...mail });
    } catch {
      // No user enumeration either way.
    }
  }
  return {
    success: "If that username or email is on file with a verified email address, a reset code has been sent to it.",
    identity: normalizeUsername(identity),
  };
}

export async function resetPasswordAction(
  prevState: OtpState,
  formData: FormData,
): Promise<OtpState> {
  const identity = normalizeUsername(
    String(formData.get("username") ?? formData.get("identity") ?? ""),
  );
  const code = String(formData.get("code") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!identity) {
    return { error: "Username or email is required." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identity }, { email: identity }] },
    select: { id: true },
  });
  if (!user) {
    return { error: "Invalid request." };
  }
  const consumed = await consumeAuthToken(user.id, AUTH_KIND.passwordReset, code);
  if (!consumed.ok) {
    return { error: consumed.error };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  redirect("/login?reset=1");
}

export async function verifyEmailAction(prevState: OtpState, formData: FormData): Promise<OtpState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "");
  if (!code) {
    return { error: "Enter the code from your email." };
  }
  const consumed = await consumeAuthToken(user.userId, AUTH_KIND.emailVerification, code);
  if (!consumed.ok) {
    return { error: consumed.error };
  }
  await prisma.user.update({
    where: { id: user.userId },
    data: { emailVerifiedAt: new Date() },
  });
  redirect("/sales");
}

export async function resendVerificationAction(
  _prevState: OtpState,
  _formData: FormData,
): Promise<OtpState> {
  const user = await requireUser();
  const record = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { email: true, username: true },
  });
  if (!record?.email) {
    return { error: "No email is on file for this account." };
  }
  if (!isMailConfigured()) {
    return { error: "Email is not configured on this server." };
  }
  const code = await createAuthToken(user.userId, AUTH_KIND.emailVerification, VERIFY_TTL_MS);
  const mail = verifyEmailEmail({
    username: record.username,
    code,
    expiresInMinutes: VERIFY_TTL_MS / 60000,
  });
  const sent = await sendMail({ to: record.email, ...mail });
  return sent
    ? { success: `A new code was sent to ${record.email}.` }
    : { error: "Could not send the code right now. Try again." };
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}