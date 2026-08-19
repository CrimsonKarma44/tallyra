"use client";

import { useActionState } from "react";
import {
  resendOrgEmailCodeAction,
  verifyOrgEmailAction,
  type OrgActionState,
} from "@/app/actions/org";

export function OrgEmailVerifyForm() {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    verifyOrgEmailAction,
    null,
  );
  const [resendState, resendAction, resendPending] = useActionState<OrgActionState, FormData>(
    resendOrgEmailCodeAction,
    null,
  );

  return (
    <>
      <p className="muted">
        A verification code was sent to this organization&apos;s email. Verify it to add
        members and receive member alerts.
      </p>
      <form action={formAction}>
        {state?.error ? <p className="error">{state.error}</p> : null}
        {state?.success ? <p className="success">{state.success}</p> : null}
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
          <button className="btn btn-small" type="submit" disabled={pending}>
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