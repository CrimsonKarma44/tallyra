"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "@/app/actions/auth";
import { PasswordField } from "@/components/PasswordField";

type Props = {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  nextPath: string;
};

export function LoginForm({ action, nextPath }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <input type="hidden" name="next" value={nextPath} />
      <p>
        <label>
          Username
          <input name="username" autoComplete="username" required autoFocus />
        </label>
      </p>
      <p>
        <PasswordField
          name="password"
          label="Password"
          autoComplete="current-password"
          required
        />
      </p>
      <div className="forgot-row">
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
