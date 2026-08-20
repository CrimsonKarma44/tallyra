"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  deleteOrgOnly,
  deleteOrgWithAdmin,
  deletePersonalAccount,
  removeOrgMember,
  transferOrgAdmin,
} from "@/lib/account-service";
import { accountDeletionRequestEmail } from "@/lib/mail-templates";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { getSession, requireUser, requireVerifiedUser } from "@/lib/session";

export type AccountActionState = { error?: string; success?: string } | null;

async function verifyCurrentPassword(userId: string, password: string): Promise<string | null> {
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!record) {
    return "Account not found.";
  }
  const ok = await bcrypt.compare(password, record.passwordHash);
  return ok ? null : "Current password is incorrect.";
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function deleteAccountAction(
  prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const password = String(formData.get("password") ?? "");
  const passwordError = await verifyCurrentPassword(user.userId, password);
  if (passwordError) {
    return { error: passwordError };
  }

  if (!user.organizationId) {
    const adminOrg = await prisma.organization.findUnique({
      where: { adminId: user.userId },
      select: { id: true, _count: { select: { members: true } } },
    });
    if (adminOrg) {
      if (adminOrg._count.members > 0) {
        return { error: "Remove the organization's members before deleting this account." };
      }
      await deleteOrgOnly(adminOrg.id);
    }
    await deletePersonalAccount(user.userId);
  } else if (!user.isOrgAdmin) {
    return {
      error:
        "As an organization member you can't delete your account directly. Request deletion from Settings and the admin will approve it.",
    };
  } else {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { _count: { select: { members: true } } },
    });
    const memberCount = org?._count.members ?? 0;
    if (memberCount > 1) {
      return { error: "Transfer admin to another member first." };
    }
    await deleteOrgWithAdmin(user.organizationId, user.userId);
  }

  const session = await getSession();
  session.destroy();
  redirect("/?deleted=1");
}

export async function transferAdminAction(
  prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  if (!user.organizationId || !user.isOrgAdmin) {
    if (!user.organizationId) {
      const owns = await prisma.organization.findUnique({
        where: { adminId: user.userId },
        select: { id: true },
      });
      if (owns) {
        return { error: "Join the organization before transferring admin." };
      }
    }
    return { error: "Only an organization admin can transfer admin." };
  }
  const successorId = String(formData.get("memberId") ?? "");
  if (!successorId || successorId === user.userId) {
    return { error: "Choose another member as the new admin." };
  }
  try {
    await transferOrgAdmin(user.organizationId, successorId);
  } catch (error) {
    return { error: errorMessage(error, "Could not transfer admin.") };
  }
  revalidatePath("/settings");
  revalidatePath("/org");
  return { success: "Admin transferred." };
}

export async function removeMemberAction(
  prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireVerifiedUser();
  if (!user.organizationId || !user.isOrgAdmin) {
    return { error: "Only an organization admin can remove members." };
  }
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId || memberId === user.userId) {
    return { error: "Invalid member." };
  }
  try {
    await removeOrgMember(user.organizationId, memberId, user.userId);
  } catch (error) {
    return { error: errorMessage(error, "Could not remove the member.") };
  }
  revalidatePath("/org");
  revalidatePath("/settings");
  return { success: "Member removed." };
}

export async function requestAccountDeletionAction(
  prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireVerifiedUser();
  if (!user.organizationId || user.isOrgAdmin) {
    return { error: "Only organization members can request account deletion." };
  }
  const password = String(formData.get("password") ?? "");
  const passwordError = await verifyCurrentPassword(user.userId, password);
  if (passwordError) {
    return { error: passwordError };
  }
  const existing = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { deletionRequestedAt: true },
  });
  if (existing?.deletionRequestedAt) {
    return { error: "A deletion request is already pending." };
  }
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);

  await prisma.user.update({
    where: { id: user.userId },
    data: { deletionRequestedAt: new Date(), deletionReason: reason || null },
  });

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true, email: true, emailVerifiedAt: true, adminId: true },
  });
  if (org?.email && org.emailVerifiedAt) {
    try {
      const mail = accountDeletionRequestEmail({
        orgName: org.name,
        memberUsername: user.username,
        reason: reason || undefined,
      });
      await sendMail({ to: org.email, ...mail });
    } catch {
      // The request still stands even if the alert email fails.
    }
  }
  revalidatePath("/settings");
  return { success: "Deletion request sent to the admin. You can cancel it until they approve." };
}

export async function cancelAccountDeletionAction(
  _prevState: AccountActionState,
  _formData: FormData,
): Promise<AccountActionState> {
  const user = await requireVerifiedUser();
  if (!user.organizationId || user.isOrgAdmin) {
    return { error: "Only organization members can cancel a deletion request." };
  }
  await prisma.user.update({
    where: { id: user.userId },
    data: { deletionRequestedAt: null, deletionReason: null },
  });
  revalidatePath("/settings");
  return { success: "Deletion request cancelled." };
}

export async function approveAccountDeletionAction(
  prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireVerifiedUser();
  if (!user.organizationId || !user.isOrgAdmin) {
    return { error: "Only the organization admin can approve deletion requests." };
  }
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId || memberId === user.userId) {
    return { error: "Invalid member." };
  }
  const member = await prisma.user.findFirst({
    where: { id: memberId, organizationId: user.organizationId, deletionRequestedAt: { not: null } },
    select: { id: true },
  });
  if (!member) {
    return { error: "No pending deletion request for that member." };
  }
  try {
    await removeOrgMember(user.organizationId, memberId, user.userId);
  } catch (error) {
    return { error: errorMessage(error, "Could not approve the deletion request.") };
  }
  revalidatePath("/org");
  revalidatePath("/settings");
  return { success: "Member removed." };
}

export async function dismissAccountDeletionAction(
  prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireVerifiedUser();
  if (!user.organizationId || !user.isOrgAdmin) {
    return { error: "Only the organization admin can dismiss deletion requests." };
  }
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId || memberId === user.userId) {
    return { error: "Invalid member." };
  }
  const member = await prisma.user.findFirst({
    where: { id: memberId, organizationId: user.organizationId, deletionRequestedAt: { not: null } },
    select: { id: true },
  });
  if (!member) {
    return { error: "No pending deletion request for that member." };
  }
  await prisma.user.update({
    where: { id: memberId },
    data: { deletionRequestedAt: null, deletionReason: null },
  });
  revalidatePath("/org");
  revalidatePath("/settings");
  return { success: "Deletion request dismissed." };
}