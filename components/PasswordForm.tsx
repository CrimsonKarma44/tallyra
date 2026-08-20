"use client";

import { useActionState } from "react";
import { changePasswordAction, type SettingsActionState } from "@/app/actions/settings";
import { PasswordField } from "@/components/PasswordField";

export function PasswordForm({ action }: { action: typeof changePasswordAction }) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <PasswordField
        name="currentPassword"
        label="Current password"
        autoComplete="current-password"
        required
        minLength={8}
      />
      <PasswordField
        name="newPassword"
        label="New password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </button>
      </div>
    </form>
  );
}