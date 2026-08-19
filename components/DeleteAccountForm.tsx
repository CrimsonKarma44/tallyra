"use client";

import { useActionState } from "react";
import { deleteAccountAction, type AccountActionState } from "@/app/actions/account";

type Props = {
  isOrgAdmin: boolean;
  hasOtherMembers: boolean;
};

export function DeleteAccountForm({ isOrgAdmin, hasOtherMembers }: Props) {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    deleteAccountAction,
    null,
  );

  if (isOrgAdmin && hasOtherMembers) {
    return (
      <p className="muted">
        Transfer admin to another member first, then you can delete your account.
      </p>
    );
  }

  return (
    <form action={formAction} className="danger-zone">
      {state?.error ? <p className="error">{state.error}</p> : null}
      <p className="muted">
        {isOrgAdmin
          ? "You are the only member. Deleting your account also deletes the organization and all of its sales and expenses."
          : "This permanently deletes your account, your sales, and your expenses."}
      </p>
      <label>
        Current password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </label>
      <div className="btn-row">
        <button className="btn btn-danger" type="submit" disabled={pending}>
          {pending ? "Deleting…" : isOrgAdmin ? "Delete organization and account" : "Delete my account"}
        </button>
      </div>
    </form>
  );
}