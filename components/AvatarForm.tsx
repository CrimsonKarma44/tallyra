"use client";

import { useActionState } from "react";
import {
  removeAvatarAction,
  updateAvatarAction,
  type SettingsActionState,
} from "@/app/actions/settings";

export function AvatarForm({ hasAvatar }: { hasAvatar: boolean }) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    updateAvatarAction,
    null,
  );

  return (
    <form action={formAction} className="avatar-form">
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <label>
        {hasAvatar ? "Replace picture" : "Choose a picture"}
        <input
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
        />
      </label>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Uploading…" : hasAvatar ? "Replace" : "Upload"}
        </button>
        {hasAvatar ? (
          <button className="btn btn-danger" type="submit" formAction={removeAvatarAction} disabled={pending}>
            Remove picture
          </button>
        ) : null}
      </div>
    </form>
  );
}