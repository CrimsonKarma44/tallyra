"use client";

import { useActionState } from "react";
import { joinOrgAction, type OrgActionState } from "@/app/actions/org";

export function JoinOrgButton({ orgId }: { orgId: string }) {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    joinOrgAction,
    null,
  );

  return (
    <form action={formAction}>
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <input type="hidden" name="orgId" value={orgId} />
      <button className="btn btn-small" type="submit" disabled={pending}>
        {pending ? "Joining…" : "Join this organization"}
      </button>
    </form>
  );
}