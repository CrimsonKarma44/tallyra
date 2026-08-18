"use client";

import { useActionState } from "react";
import { changePasswordAction, type SettingsActionState } from "@/app/actions/settings";

export function PasswordForm({ action }: { action: typeof changePasswordAction }) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <label>
        Current password
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </label>
      <label>
        New password
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </label>
      <label>
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </label>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </button>
      </div>
    </form>
  );
}