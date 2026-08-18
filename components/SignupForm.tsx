"use client";

import { useActionState, useState } from "react";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  nextPath: string;
};

export function SignupForm({ action, nextPath }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [accountType, setAccountType] = useState<"solo" | "create-org">("solo");

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <input type="hidden" name="next" value={nextPath} />
      <p>
        <label>
          Username
          <input name="username" autoComplete="username" required autoFocus minLength={3} maxLength={32} />
        </label>
      </p>
      <p>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
      </p>
      <p>
        <label>
          Password
          <input name="password" type="password" autoComplete="new-password" required minLength={8} />
        </label>
      </p>
      <p>
        <label>
          Confirm password
          <input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </label>
      </p>
      <fieldset className="account-type">
        <legend>Account type</legend>
        <label className="radio-row">
          <input
            type="radio"
            name="accountType"
            value="solo"
            checked={accountType === "solo"}
            onChange={() => setAccountType("solo")}
          />
          <span>
            <strong>Personal</strong> — I keep my own sales book.
          </span>
        </label>
        <label className="radio-row">
          <input
            type="radio"
            name="accountType"
            value="create-org"
            checked={accountType === "create-org"}
            onChange={() => setAccountType("create-org")}
          />
          <span>
            <strong>Create an organization</strong> — I become the admin of a shared ledger.
          </span>
        </label>
        {accountType === "create-org" ? (
          <>
            <label className="org-name-field">
              Organization name
              <input name="orgName" autoComplete="organization" minLength={3} maxLength={40} />
            </label>
            <label className="org-name-field">
              Company email (for alerts)
              <input name="orgEmail" type="email" maxLength={254} />
            </label>
          </>
        ) : null}
      </fieldset>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </div>
    </form>
  );
}