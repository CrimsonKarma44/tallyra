"use client";

import { useActionState } from "react";
import { removeMemberAction, type AccountActionState } from "@/app/actions/account";

export function RemoveMemberButton({ memberId }: { memberId: string }) {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    removeMemberAction,
    null,
  );

  return (
    <form action={formAction} className="remove-member-form">
      <input type="hidden" name="memberId" value={memberId} />
      {state?.error ? <span className="error">{state.error}</span> : null}
      {state?.success ? <span className="success">{state.success}</span> : null}
      <button
        className="btn btn-danger btn-small"
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (!confirm("Remove this member? Their sales and expenses will be reassigned to you.")) {
            event.preventDefault();
          }
        }}
      >
        {pending ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}