"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { validateDisplayName, validatePassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type SettingsActionState = { error?: string; success?: string } | null;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function revalidateApp() {
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function updateAvatarAction(
  prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return { error: "Choose an image to upload." };
  }
  if (!AVATAR_MIME_TYPES.has(file.type)) {
    return { error: "Only JPEG, PNG, or WebP images are allowed." };
  }
  if (file.size === 0 || file.size > MAX_AVATAR_BYTES) {
    return { error: "Image must be smaller than 2MB." };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  await prisma.user.update({
    where: { id: user.userId },
    data: { avatar: bytes, avatarMime: file.type, avatarUpdatedAt: new Date() },
  });
  await revalidateApp();
  return { success: "Profile picture updated." };
}

export async function removeAvatarAction(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.userId },
    data: { avatar: null, avatarMime: null, avatarUpdatedAt: null },
  });
  await revalidateApp();
}

export async function updateProfileAction(
  prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const nameError = validateDisplayName(displayName);
  if (nameError) {
    return { error: nameError };
  }
  await prisma.user.update({
    where: { id: user.userId },
    data: { displayName: displayName || null },
  });
  await revalidateApp();
  return { success: "Profile saved." };
}

export async function changePasswordAction(
  prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const record = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!record) {
    return { error: "User not found." };
  }
  const ok = await bcrypt.compare(current, record.passwordHash);
  if (!ok) {
    return { error: "Current password is incorrect." };
  }
  const passwordError = validatePassword(next);
  if (passwordError) {
    return { error: passwordError };
  }
  if (next !== confirm) {
    return { error: "New passwords do not match." };
  }
  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({
    where: { id: user.userId },
    data: { passwordHash },
  });
  return { success: "Password changed." };
}