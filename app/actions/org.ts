"use server";

import { revalidatePath } from "next/cache";
import { normalizeUsername, validateEmail, validatePassword, validateUsername } from "@/lib/auth";
import { addOrgMember } from "@/lib/org";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { AUTH_KIND, VERIFY_TTL_MS, createAuthToken } from "@/lib/otp";
import { newMemberAlertEmail, verifyEmailEmail } from "@/lib/mail-templates";

export type OrgActionState = { error?: string; success?: string } | null;

export async function addMemberAction(
  prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const user = await requireUser();
  if (!user.isOrgAdmin || !user.organizationId) {
    return { error: "Only an organization admin can add members." };
  }
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const usernameError = validateUsername(username);
  if (usernameError) {
    return { error: usernameError };
  }
  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const created = await addOrgMember(user.organizationId, username, email, password);
  if (!created.ok) {
    return { error: created.error };
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { email: true, name: true },
  });

  if (isMailConfigured()) {
    try {
      const code = await createAuthToken(created.data.userId, AUTH_KIND.emailVerification, VERIFY_TTL_MS);
      const verifyMail = verifyEmailEmail({
        username,
        code,
        expiresInMinutes: VERIFY_TTL_MS / 60000,
      });
      await sendMail({ to: email, ...verifyMail });
    } catch {
      // Email failures never block member creation.
    }
    if (org?.email) {
      const alert = newMemberAlertEmail({
        orgName: org.name,
        memberUsername: username,
        addedBy: user.username,
      });
      void sendMail({ to: org.email, ...alert }).catch(() => {});
    }
  }

  revalidatePath("/org");
  return { success: `Member ${created.data.username} added.` };
}