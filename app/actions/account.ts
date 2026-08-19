"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  deleteOrgWithAdmin,
  deletePersonalAccount,
  removeOrgMember,
  transferOrgAdmin,
} from "@/lib/account-service";
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
    await deletePersonalAccount(user.userId);
  } else if (!user.isOrgAdmin) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { adminId: true },
    });
    if (!org) {
      return { error: "Organization not found." };
    }
    await removeOrgMember(user.organizationId, user.userId, org.adminId);
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