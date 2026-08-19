"use client";

import { useActionState } from "react";
import { deleteOrgAction, type OrgActionState } from "@/app/actions/org";

export function DeleteOrgForm() {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    deleteOrgAction,
    null,
  );

  return (
    <form action={formAction} className="danger-zone">
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <p className="muted">
        Deletes the organization. Members&apos; sales and expenses are reassigned to your
        personal ledger and the member accounts are removed. Your account stays.
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
          {pending ? "Deleting…" : "Delete organization"}
        </button>
      </div>
    </form>
  );
}
