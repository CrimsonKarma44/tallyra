"use client";

import { useActionState } from "react";
import { addMemberAction, type OrgActionState } from "@/app/actions/org";
import { PasswordField } from "@/components/PasswordField";

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
        Email
        <input name="email" type="email" autoComplete="off" required maxLength={254} />
      </label>
      <PasswordField
        name="password"
        label="Password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <PasswordField
        name="confirm"
        label="Confirm password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </button>
      </div>
    </form>
  );
}