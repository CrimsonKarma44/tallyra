"use client";

import { useActionState } from "react";
import {
  cancelAccountDeletionAction,
  deleteAccountAction,
  requestAccountDeletionAction,
  type AccountActionState,
} from "@/app/actions/account";
import { PasswordField } from "@/components/PasswordField";

type Props = {
  isOrgAdmin: boolean;
  isOrgMember: boolean;
  hasOtherMembers: boolean;
  deletionPending: boolean;
};

function DirectDeleteForm({ isOrgAdmin }: { isOrgAdmin: boolean }) {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    deleteAccountAction,
    null,
  );

  return (
    <form action={formAction} className="danger-zone">
      {state?.error ? <p className="error">{state.error}</p> : null}
      <p className="muted">
        {isOrgAdmin
          ? "You are the only member. Deleting your account also deletes the organization and all of its sales and expenses."
          : "This permanently deletes your account, your sales, and your expenses."}
      </p>
      <PasswordField
        name="password"
        label="Current password"
        autoComplete="current-password"
        required
        minLength={8}
      />
      <div className="btn-row">
        <button className="btn btn-danger" type="submit" disabled={pending}>
          {pending ? "Deleting…" : isOrgAdmin ? "Delete organization and account" : "Delete my account"}
        </button>
      </div>
    </form>
  );
}

function RequestDeletionForm() {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    requestAccountDeletionAction,
    null,
  );

  return (
    <form action={formAction} className="danger-zone">
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <p className="muted">
        Members can&apos;t delete their account directly. Send a request to the
        organization admin, who must approve it before the account is removed.
      </p>
      <PasswordField
        name="password"
        label="Current password"
        autoComplete="current-password"
        required
        minLength={8}
      />
      <label>
        Reason (optional)
        <textarea name="reason" maxLength={200} rows={2} placeholder="Why are you leaving?" />
      </label>
      <div className="btn-row">
        <button className="btn btn-danger" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Request account deletion"}
        </button>
      </div>
    </form>
  );
}

function PendingRequestPanel() {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    cancelAccountDeletionAction,
    null,
  );

  return (
    <div className="danger-zone">
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <p className="muted">
        Your deletion request is pending the admin&apos;s decision. You can cancel it
        while you wait.
      </p>
      <form action={formAction}>
        <div className="btn-row">
          <button className="btn btn-secondary" type="submit" disabled={pending}>
            {pending ? "Cancelling…" : "Cancel deletion request"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function DeleteAccountForm({ isOrgAdmin, isOrgMember, hasOtherMembers, deletionPending }: Props) {
  if (isOrgAdmin && hasOtherMembers) {
    return (
      <p className="muted">
        Transfer admin to another member first, then you can delete your account.
      </p>
    );
  }

  if (isOrgMember) {
    return deletionPending ? <PendingRequestPanel /> : <RequestDeletionForm />;
  }

  return <DirectDeleteForm isOrgAdmin={isOrgAdmin} />;
}