"use server";

import { revalidatePath } from "next/cache";
import { normalizeUsername, validatePassword, validateUsername } from "@/lib/auth";
import { addOrgMember } from "@/lib/org";
import { requireUser } from "@/lib/session";

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
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

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

  const created = await addOrgMember(user.organizationId, username, password);
  if (!created.ok) {
    return { error: created.error };
  }
  revalidatePath("/org");
  return { success: `Member ${created.data.username} added.` };
}