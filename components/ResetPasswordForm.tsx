"use client";

import { useActionState } from "react";
import { resetPasswordAction, type OtpState } from "@/app/actions/auth";
import { PasswordField } from "@/components/PasswordField";

export function ResetPasswordForm({ username }: { username?: string }) {
  const [state, formAction, pending] = useActionState<OtpState, FormData>(
    resetPasswordAction,
    null,
  );

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <p>
        <label>
          Username or email
          <input name="username" autoComplete="username" required autoFocus defaultValue={username} />
        </label>
      </p>
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
          />
        </label>
      </p>
      <p>
        <PasswordField
          name="password"
          label="New password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </p>
      <p>
        <PasswordField
          name="confirm"
          label="Confirm new password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </p>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Resetting…" : "Reset password"}
        </button>
      </div>
    </form>
  );
}