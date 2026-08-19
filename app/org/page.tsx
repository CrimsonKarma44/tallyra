import { notFound } from "next/navigation";
import Link from "next/link";
import { AddMemberForm } from "@/components/AddMemberForm";
import { DeleteOrgForm } from "@/components/DeleteOrgForm";
import { OrgEmailVerifyForm } from "@/components/OrgEmailVerifyForm";
import { RemoveMemberButton } from "@/components/RemoveMemberButton";
import { getOrgDetails } from "@/lib/org";
import { requireVerifiedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function OrgPage() {
  const user = await requireVerifiedUser();
  if (!user.organizationId) {
    const adminOrg = await prisma.organization.findUnique({
      where: { adminId: user.userId },
      select: { name: true },
    });
    if (adminOrg) {
      return (
        <main className="main">
          <div className="sale-card">
            <h1>{adminOrg.name}</h1>
            <p className="lede">You created this organization but haven&apos;t joined it yet.</p>
            <p className="muted">
              Your sales book is still personal. Join the organization from Settings &rarr;
              Your organizations to share your ledger with its members.
            </p>
            <div className="btn-row">
              <Link className="btn" href="/settings">
                Go to Settings
              </Link>
            </div>
          </div>
        </main>
      );
    }
    return (
      <main className="main">
        <div className="sale-card">
          <h1>Organization</h1>
          <p className="lede">
            You are not part of an organization, so your sales book stays personal.
          </p>
          <p className="muted">
            Create an organization from Settings, or wait until an admin adds your
            account to theirs.
          </p>
          <div className="btn-row">
            <Link className="btn" href="/settings">
              Create an organization
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const org = await getOrgDetails(user.organizationId);
  if (!org) {
    notFound();
  }

  return (
    <main className="main">
      <div className="sale-card">
        <h1>{org.name}</h1>
        <p className="lede">
          {user.isOrgAdmin ? "You are the admin of this organization." : "Shared ledger organization."}
        </p>

        <section className="settings-section">
          <h2>Members</h2>
          <div className="table-wrap org-members">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  {user.isOrgAdmin ? <th>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {org.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.displayName || member.username}</td>
                    <td>{member.id === org.adminId ? "Admin" : "Member"}</td>
                    {user.isOrgAdmin && member.id !== org.adminId ? (
                      <td>
                        <RemoveMemberButton memberId={member.id} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {user.isOrgAdmin && org.email && !org.emailVerifiedAt ? (
          <>
            <hr className="settings-divider" />
            <section className="settings-section">
              <h2>Verify organization email</h2>
              <OrgEmailVerifyForm />
            </section>
          </>
        ) : null}

        {user.isOrgAdmin ? (
          <>
            <hr className="settings-divider" />
            <section className="settings-section">
              <h2>Add member</h2>
              <p className="muted">Create a member account for this organization.</p>
              <AddMemberForm />
            </section>
          </>
        ) : null}

        {user.isOrgAdmin ? (
          <>
            <hr className="settings-divider" />
            <section className="settings-section">
              <h2>Delete organization</h2>
              <DeleteOrgForm />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}