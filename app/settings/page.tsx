import Image from "next/image";
import {
  changePasswordAction,
} from "@/app/actions/settings";
import { AvatarForm } from "@/components/AvatarForm";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { PasswordForm } from "@/components/PasswordForm";
import { ProfileForm } from "@/components/ProfileForm";
import { TransferAdminForm } from "@/components/TransferAdminForm";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await requireUser();
  const record = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      username: true,
      displayName: true,
      avatarUpdatedAt: true,
    },
  });
  const org = user.organizationId
    ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          adminId: true,
          members: {
            select: { id: true, username: true, displayName: true },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;
  const hasOtherMembers = Boolean(org && org.members.some((m) => m.id !== user.userId));
  const hasAvatar = Boolean(record?.avatarUpdatedAt);
  const avatarVersion = record?.avatarUpdatedAt?.getTime();
  const displayName = record?.displayName ?? "";
  const initial = (record?.displayName?.trim() || record?.username || "").charAt(0).toUpperCase();

  return (
    <main className="main settings-page">
      <div className="sale-card">
        <h1>Settings</h1>
        <p className="lede">Your account for {user.username}.</p>

        <section className="settings-section">
          <h2>Profile picture</h2>
          <p className="muted">
            Shown in the top bar. JPEG, PNG, or WebP, up to 2MB.
          </p>
          <div className="avatar-preview">
            {hasAvatar ? (
              <Image
                className="avatar avatar-large"
                src={`/api/me/avatar?v=${avatarVersion}`}
                alt="Your profile picture"
                width={96}
                height={96}
                unoptimized
              />
            ) : (
              <span className="avatar avatar-large avatar-fallback">{initial}</span>
            )}
          </div>
          <AvatarForm hasAvatar={hasAvatar} />
        </section>

        <hr className="settings-divider" />

        <section className="settings-section">
          <h2>Display name</h2>
          <p className="muted">How you appear in the top bar. Leave blank to use your username.</p>
          <ProfileForm displayName={displayName} />
        </section>

        <hr className="settings-divider" />

        <section className="settings-section">
          <h2>Change password</h2>
          <PasswordForm action={changePasswordAction} />
        </section>

        {user.organizationId && user.isOrgAdmin && hasOtherMembers ? (
          <>
            <hr className="settings-divider" />
            <section className="settings-section">
              <h2>Transfer admin</h2>
              <p className="muted">
                Hand the organization to another member. You become a regular member and can
                then delete your account.
              </p>
              <TransferAdminForm currentUserId={user.userId} members={org?.members ?? []} />
            </section>
          </>
        ) : null}

        <hr className="settings-divider" />

        <section className="settings-section">
          <h2>Delete account</h2>
          <DeleteAccountForm isOrgAdmin={user.isOrgAdmin} hasOtherMembers={hasOtherMembers} />
        </section>
      </div>
    </main>
  );
}