import Image from "next/image";
import Link from "next/link";
import {
  changePasswordAction,
} from "@/app/actions/settings";
import { AvatarForm } from "@/components/AvatarForm";
import { CreateOrgForm } from "@/components/CreateOrgForm";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { JoinOrgButton } from "@/components/JoinOrgButton";
import { OrgEmailVerifyForm } from "@/components/OrgEmailVerifyForm";
import { PasswordForm } from "@/components/PasswordForm";
import { ProfileForm } from "@/components/ProfileForm";
import { TransferAdminForm } from "@/components/TransferAdminForm";
import { getUserOrganizations } from "@/lib/org";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await requireUser();
  const record = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      username: true,
      email: true,
      displayName: true,
      avatarUpdatedAt: true,
      deletionRequestedAt: true,
      deletionReason: true,
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

  const userEmail = record?.email ?? null;
  const organizations = await getUserOrganizations(user.userId, userEmail, user.organizationId);

  const associatedAccounts =
    !user.organizationId && userEmail
      ? await prisma.user.findMany({
          where: { email: userEmail, organizationId: { not: null } },
          select: { username: true, organization: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        })
      : [];

  return (
    <main className="main settings-page">
      <div className="sale-card settings-card">
        <h1>Settings</h1>
        <p className="lede">Your account for {user.username}.</p>

        <section className="settings-section">
          <h2>Profile picture</h2>
          <p className="muted">
            Shown in the top bar. JPEG, PNG, or WebP, up to 2MB.
          </p>
          <div className="settings-profile">
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
          </div>
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

        {!user.organizationId && !user.createdByOrgId ? (
          <>
            <hr className="settings-divider" />
            <section className="settings-section">
              <h2>Create an organization</h2>
              <p className="muted">
                Turn your personal ledger into a shared team ledger. You join the new
                organization right away and can switch views from the top bar.
              </p>
              <CreateOrgForm userEmail={userEmail} />
            </section>
          </>
        ) : null}

        {organizations.length > 0 ? (
          <>
            <hr className="settings-divider" />
            <section className="settings-section">
              <h2>Your organizations</h2>
              <div className="org-list">
                {organizations.map((org) => (
                  <div className="org-item" key={org.id}>
                    <div className="org-item-main">
                      <strong>{org.name}</strong>
                      <span className="muted">{org.email ?? "No email on file"}</span>
                      <span
                        className={org.emailVerifiedAt ? "org-status" : "org-status org-status-pending"}
                      >
                        {org.emailVerifiedAt ? "Email verified" : "Email not verified"}
                      </span>
                      <span className="muted">
                        {org.memberCount} {org.memberCount === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <div className="org-item-actions">
                      {org.isAdmin && !org.isMember ? (
                        <>
                          {!org.emailVerifiedAt ? <OrgEmailVerifyForm /> : null}
                          <JoinOrgButton orgId={org.id} />
                        </>
                      ) : null}
                      {org.isMember ? (
                        <Link className="btn btn-small" href="/org">
                          {org.isAdmin ? "Manage organization" : "Go to organization"}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

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

        {associatedAccounts.length > 0 ? (
          <>
            <hr className="settings-divider" />
            <section className="settings-section">
              <h2>Associated accounts</h2>
              <p className="muted">
                Organization accounts that use your email. Sign in with that account to
                record entries for the organization.
              </p>
              <div className="org-list">
                {associatedAccounts.map((account, index) => (
                  <div className="org-item" key={`${account.username}-${index}`}>
                    <div className="org-item-main">
                      <strong>{account.username}</strong>
                      <span className="muted">{account.organization?.name ?? "Unknown organization"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        <hr className="settings-divider" />

        <section className="settings-section">
          <h2>Delete account</h2>
          <DeleteAccountForm
            isOrgAdmin={user.isOrgAdmin}
            isOrgMember={Boolean(user.organizationId && !user.isOrgAdmin)}
            hasOtherMembers={hasOtherMembers}
            deletionPending={Boolean(record?.deletionRequestedAt)}
          />
        </section>
      </div>
    </main>
  );
}