"use client";

import { useActionState } from "react";
import {
  approveAccountDeletionAction,
  dismissAccountDeletionAction,
  type AccountActionState,
} from "@/app/actions/account";

export function DeletionRequestActions({ memberId }: { memberId: string }) {
  const [approveState, approveFormAction, approvePending] = useActionState<
    AccountActionState,
    FormData
  >(approveAccountDeletionAction, null);
  const [dismissState, dismissFormAction, dismissPending] = useActionState<
    AccountActionState,
    FormData
  >(dismissAccountDeletionAction, null);

  return (
    <div className="request-actions">
      {approveState?.error ? <p className="error">{approveState.error}</p> : null}
      {dismissState?.error ? <p className="error">{dismissState.error}</p> : null}
      <div className="btn-row">
        <form action={approveFormAction}>
          <input type="hidden" name="memberId" value={memberId} />
          <button className="btn btn-small btn-danger" type="submit" disabled={approvePending}>
            {approvePending ? "Removing…" : "Approve"}
          </button>
        </form>
        <form action={dismissFormAction}>
          <input type="hidden" name="memberId" value={memberId} />
          <button className="btn btn-small btn-ghost" type="submit" disabled={dismissPending}>
            {dismissPending ? "Dismissing…" : "Dismiss"}
          </button>
        </form>
      </div>
    </div>
  );
}