"use client";

import { useActionState } from "react";
import { transferAdminAction, type AccountActionState } from "@/app/actions/account";

type Props = {
  currentUserId: string;
  members: Array<{ id: string; username: string; displayName: string | null }>;
};

export function TransferAdminForm({ currentUserId, members }: Props) {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    transferAdminAction,
    null,
  );
  const options = members.filter((m) => m.id !== currentUserId);

  return (
    <form action={formAction} className="transfer-form">
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.success ? <p className="success">{state.success}</p> : null}
      <label>
        New admin
        <select name="memberId" required>
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName || m.username}
            </option>
          ))}
        </select>
      </label>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Transferring…" : "Transfer admin"}
        </button>
      </div>
    </form>
  );
}