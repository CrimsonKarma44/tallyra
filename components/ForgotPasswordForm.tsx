"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type OtpState } from "@/app/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<OtpState, FormData>(
    requestPasswordResetAction,
    null,
  );

  if (state?.success) {
    return <p className="success">{state.success}</p>;
  }

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <p>
        <label>
          Username or email
          <input name="identity" autoComplete="username" required autoFocus />
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