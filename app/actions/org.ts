"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { normalizeUsername, validateEmail, validateOrgName, validatePassword, validateUsername } from "@/lib/auth";
import { assertEmailDomain } from "@/lib/email-check";
import { resolveMigrateSelection } from "@/lib/migrate";
import {
  addOrgMember,
  createOrganizationForExistingUser,
  joinOrganization,
  moveEntriesToOrg,
  moveEntriesToPersonal,
} from "@/lib/org";
import { deleteOrganization } from "@/lib/account-service";
import { getSession, requireUser, requireVerifiedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { AUTH_KIND, VERIFY_TTL_MS, consumeAuthToken, createAuthToken } from "@/lib/otp";
import { newMemberAlertEmail, verifyEmailEmail, verifyOrgEmailEmail } from "@/lib/mail-templates";

export type OrgActionState = { error?: string; success?: string } | null;

export async function addMemberAction(
  prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const user = await requireVerifiedUser();
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
  const domainError = await assertEmailDomain(email);
  if (domainError) {
    return { error: domainError };
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { email: true, emailVerifiedAt: true, name: true },
  });
  if (org?.email && !org.emailVerifiedAt) {
    return { error: "Verify the organization email before adding members." };
  }

  const created = await addOrgMember(user.organizationId, username, email, password);
  if (!created.ok) {
    return { error: created.error };
  }

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
    if (org?.email && org.emailVerifiedAt) {
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

export async function createOrgAction(
  prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const user = await requireUser();
  if (user.organizationId) {
    return { error: "You already belong to an organization." };
  }
  if (user.createdByOrgId) {
    return { error: "Sub-accounts cannot create organizations." };
  }
  const orgName = String(formData.get("orgName") ?? "").trim();
  const emailChoice = String(formData.get("emailChoice") ?? "same");
  const newEmail = String(formData.get("orgEmail") ?? "").trim();
  const migrateExisting = formData.get("migrateExisting") === "on";

  const orgNameError = validateOrgName(orgName);
  if (orgNameError) {
    return { error: orgNameError };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { email: true },
  });
  let orgEmail: string | null;
  if (emailChoice === "new") {
    const emailError = validateEmail(newEmail);
    if (emailError) {
      return { error: `Organization email: ${emailError.toLowerCase()}` };
    }
    orgEmail = newEmail;
  } else {
    orgEmail = record?.email ?? null;
    if (!orgEmail) {
      return { error: "Add an email to your account first, or choose a new organization email." };
    }
  }

  const created = await createOrganizationForExistingUser(orgName, orgEmail, user.userId);
  if (!created.ok) {
    return { error: created.error };
  }

  if (migrateExisting) {
    await moveEntriesToOrg(user.userId, created.data.orgId);
  }

  if (created.data.emailVerifiedAt === null && isMailConfigured() && orgEmail) {
    try {
      const code = await createAuthToken(user.userId, AUTH_KIND.orgEmailVerification, VERIFY_TTL_MS);
      const mail = verifyOrgEmailEmail({
        orgName,
        code,
        expiresInMinutes: VERIFY_TTL_MS / 60000,
      });
      await sendMail({ to: orgEmail, ...mail });
    } catch {
      // Email failures never block organization creation.
    }
  }

  revalidatePath("/settings");
  const verifiedSuffix =
    created.data.emailVerifiedAt === null ? " Verify its email to add members." : "";
  const migratedSuffix = migrateExisting ? " Your existing entries were moved into it." : "";
  return {
    success: `Organization ${orgName} created.${verifiedSuffix}${migratedSuffix}`,
  };
}

export async function verifyOrgEmailAction(
  prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const user = await requireUser();
  const org = await prisma.organization.findUnique({
    where: { adminId: user.userId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true },
  });
  if (!org) {
    return { error: "You do not own an organization." };
  }
  if (!org.email) {
    return { error: "This organization has no email to verify." };
  }
  if (org.emailVerifiedAt) {
    return { error: "This organization's email is already verified." };
  }
  const code = String(formData.get("code") ?? "");
  if (!code) {
    return { error: "Enter the code from your email." };
  }
  const consumed = await consumeAuthToken(user.userId, AUTH_KIND.orgEmailVerification, code);
  if (!consumed.ok) {
    return { error: consumed.error };
  }
  await prisma.organization.update({
    where: { id: org.id },
    data: { emailVerifiedAt: new Date() },
  });
  revalidatePath("/settings");
  return { success: `Email for ${org.name} verified. You can now add members.` };
}

export async function resendOrgEmailCodeAction(
  _prevState: OrgActionState,
  _formData: FormData,
): Promise<OrgActionState> {
  const user = await requireUser();
  const org = await prisma.organization.findUnique({
    where: { adminId: user.userId },
    select: { name: true, email: true, emailVerifiedAt: true },
  });
  if (!org) {
    return { error: "You do not own an organization." };
  }
  if (!org.email) {
    return { error: "This organization has no email to verify." };
  }
  if (org.emailVerifiedAt) {
    return { error: "This organization's email is already verified." };
  }
  if (!isMailConfigured()) {
    return { error: "Email is not configured on this server." };
  }
  const code = await createAuthToken(user.userId, AUTH_KIND.orgEmailVerification, VERIFY_TTL_MS);
  const mail = verifyOrgEmailEmail({
    orgName: org.name,
    code,
    expiresInMinutes: VERIFY_TTL_MS / 60000,
  });
  const sent = await sendMail({ to: org.email, ...mail });
  return sent
    ? { success: `A new code was sent to ${org.email}.` }
    : { error: "Could not send the code right now. Try again." };
}

export async function joinOrgAction(
  prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const user = await requireUser();
  if (user.organizationId) {
    return { error: "You already belong to an organization." };
  }
  const orgId = String(formData.get("orgId") ?? "");
  if (!orgId) {
    return { error: "Organization is required." };
  }
  const joined = await joinOrganization(orgId, user.userId);
  if (!joined.ok) {
    return { error: joined.error };
  }
  revalidatePath("/settings");
  revalidatePath("/org");
  return {
    success: `You joined ${joined.data.name}. Your sales and expenses are now part of the shared ledger.`,
  };
}

async function setLedgerContext(context: "personal" | "org") {
  const user = await requireUser();
  if (context === "personal" && !user.organizationId) {
    redirect("/sales");
  }
  const session = await getSession();
  session.ledgerContext = context;
  await session.save();
  revalidatePath("/sales");
  redirect("/sales");
}

export async function setPersonalLedgerAction() {
  await setLedgerContext("personal");
}

export async function setOrgLedgerAction() {
  await setLedgerContext("org");
}

export async function migrateEntriesAction(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const user = await requireVerifiedUser();
  const direction = String(formData.get("direction") ?? "");
  const selection = resolveMigrateSelection(String(formData.get("ids") ?? ""));
  let ids: string[] = [];
  if (selection.kind === "selected") {
    if (selection.ids.length === 0) {
      return { error: "Select at least one entry to move." };
    }
    ids = selection.ids;
  }
  if (direction === "to-org") {
    if (!user.organizationId) {
      return { error: "You do not belong to an organization." };
    }
    await moveEntriesToOrg(user.userId, user.organizationId, ids);
    revalidatePath("/sales");
    revalidatePath("/expenses");
    redirect("/sales");
  }
  if (direction === "to-personal") {
    if (!user.organizationId || !user.isOrgAdmin) {
      return { error: "Only the organization admin can move entries back to a personal ledger." };
    }
    await moveEntriesToPersonal(user.organizationId, user.userId, ids);
    revalidatePath("/sales");
    revalidatePath("/expenses");
    redirect("/sales");
  }
  return { error: "Invalid migration direction." };
}

export async function deleteOrgAction(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const user = await requireUser();
  const org = await prisma.organization.findUnique({
    where: { adminId: user.userId },
    select: { id: true, name: true },
  });
  if (!org) {
    return { error: "You do not own an organization." };
  }
  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { error: "Enter your current password to confirm." };
  }
  const record = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { passwordHash: true },
  });
  const matches = record && (await bcrypt.compare(password, record.passwordHash));
  if (!matches) {
    return { error: "That password is incorrect." };
  }
  try {
    await deleteOrganization(org.id, user.userId);
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message ? error.message : "Could not delete the organization.",
    };
  }
  const session = await getSession();
  delete session.ledgerContext;
  await session.save();
  revalidatePath("/settings");
  revalidatePath("/org");
  revalidatePath("/sales");
  redirect("/sales");
}
