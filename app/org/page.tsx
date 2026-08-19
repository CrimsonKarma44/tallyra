import { notFound } from "next/navigation";
import { AddMemberForm } from "@/components/AddMemberForm";
import { RemoveMemberButton } from "@/components/RemoveMemberButton";
import { getOrgDetails } from "@/lib/org";
import { requireVerifiedUser } from "@/lib/session";

export default async function OrgPage() {
  const user = await requireVerifiedUser();
  if (!user.organizationId) {
    return (
      <main className="main">
        <div className="sale-card">
          <h1>Organization</h1>
          <p className="lede">
            You are not part of an organization, so your sales book stays personal.
          </p>
          <p className="muted">
            Organizations are created at sign-up. When an admin adds an account, that
            member joins the organization&apos;s shared ledger.
          </p>
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

        {user.isOrgAdmin ? (
          <>
            <hr className="settings-divider" />
            <section className="settings-section">
              <h2>Add member</h2>
              <p className="muted">Create an account that shares this organization&apos;s ledger.</p>
              <AddMemberForm />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}