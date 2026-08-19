"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  type OtpState,
} from "@/app/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<OtpState, FormData>(
    requestPasswordResetAction,
    null,
  );
  const [resetState, resetFormAction, resetPending] = useActionState<OtpState, FormData>(
    resetPasswordAction,
    null,
  );

  if (state?.success) {
    return (
      <form action={resetFormAction}>
        <p className="success">{state.success}</p>
        {resetState?.error ? <p className="error">{resetState.error}</p> : null}
        <input type="hidden" name="identity" value={state.identity ?? ""} />
        <p>
          <label>
            Reset code
            <input
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              autoFocus
            />
          </label>
        </p>
        <p>
          <label>
            New password
            <input name="password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
        </p>
        <p>
          <label>
            Confirm new password
            <input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
          </label>
        </p>
        <div className="btn-row">
          <button className="btn" type="submit" disabled={resetPending}>
            {resetPending ? "Resetting…" : "Reset password"}
          </button>
        </div>
        <p className="auth-switch">
          <a href="/forgot-password">Didn&apos;t get the code? Request a new one.</a>
        </p>
      </form>
    );
  }

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <p>
        <label>
          Username or email
          <input
            name="identity"
            autoComplete="username"
            required
            autoFocus
          />
        </label>
      </p>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reset code"}
        </button>
      </div>
    </form>
  );
}