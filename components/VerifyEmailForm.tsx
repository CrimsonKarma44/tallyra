"use client";

import { useActionState } from "react";
import { resendVerificationAction, verifyEmailAction, type OtpState } from "@/app/actions/auth";

export function VerifyEmailForm() {
  const [state, formAction, pending] = useActionState<OtpState, FormData>(
    verifyEmailAction,
    null,
  );
  const [resendState, resendAction, resendPending] = useActionState<OtpState, FormData>(
    resendVerificationAction,
    null,
  );

  return (
    <>
      <form action={formAction}>
        {state?.error ? <p className="error">{state.error}</p> : null}
        <p>
          <label>
            Verification code
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
        <div className="btn-row">
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Verifying…" : "Verify email"}
          </button>
        </div>
      </form>
      <form action={resendAction} className="resend-form">
        {resendState?.error ? <p className="error">{resendState.error}</p> : null}
        {resendState?.success ? <p className="success">{resendState.success}</p> : null}
        <div className="forgot-row">
          <button className="link-btn" type="submit" disabled={resendPending}>
            {resendPending ? "Sending…" : "Resend code"}
          </button>
        </div>
      </form>
    </>
  );
}