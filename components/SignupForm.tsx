"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  nextPath: string;
};

export function SignupForm({ action, nextPath }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

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
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
