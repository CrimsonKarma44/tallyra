"use client";

import { useActionState } from "react";
import { updateProfileAction, type SettingsActionState } from "@/app/actions/settings";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    updateProfileAction,
    null,
  );

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <div className="field-row">
        <label className="field-grow">
          Display name
          <input name="displayName" defaultValue={displayName} maxLength={40} autoComplete="off" />
        </label>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}