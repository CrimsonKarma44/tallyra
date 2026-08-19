"use client";

import { useActionState, useState } from "react";
import { createOrgAction, type OrgActionState } from "@/app/actions/org";

export function CreateOrgForm({ userEmail }: { userEmail: string | null }) {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    createOrgAction,
    null,
  );
  const [emailChoice, setEmailChoice] = useState<"same" | "new">(userEmail ? "same" : "new");

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <p>
        <label>
          Organization name
          <input name="orgName" autoComplete="organization" required minLength={3} maxLength={40} />
        </label>
      </p>
      <fieldset className="account-type">
        <legend>Organization email</legend>
        {userEmail ? (
          <label className="radio-row">
            <input
              type="radio"
              name="emailChoice"
              value="same"
              checked={emailChoice === "same"}
              onChange={() => setEmailChoice("same")}
            />
            <span>
              Use my email — <strong>{userEmail}</strong>
            </span>
          </label>
        ) : null}
        <label className="radio-row">
          <input
            type="radio"
            name="emailChoice"
            value="new"
            checked={emailChoice === "new"}
            onChange={() => setEmailChoice("new")}
          />
          <span>
            <strong>Use a new email</strong> — a verification code will be sent to it.
          </span>
        </label>
        {emailChoice === "new" ? (
          <label className="org-name-field">
            New organization email
            <input name="orgEmail" type="email" required maxLength={254} autoComplete="email" />
          </label>
        ) : null}
      </fieldset>
      <p className="muted">
        Your existing sales and expenses stay on your personal ledger until you join
        the organization from the list below.
      </p>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create organization"}
        </button>
      </div>
    </form>
  );
}