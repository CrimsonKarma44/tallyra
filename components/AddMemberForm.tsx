"use client";

import { useActionState } from "react";
import { addMemberAction, type OrgActionState } from "@/app/actions/org";

export function AddMemberForm() {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    addMemberAction,
    null,
  );

  return (
    <form action={formAction} className="add-member">
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <label>
        Username
        <input name="username" autoComplete="off" required minLength={3} maxLength={32} />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <label>
        Confirm password
        <input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </button>
      </div>
    </form>
  );
}