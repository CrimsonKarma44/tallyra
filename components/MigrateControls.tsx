"use client";

import { useActionState, useRef, useState } from "react";
import { migrateEntriesAction, type OrgActionState } from "@/app/actions/org";

type Props = {
  direction: "to-org" | "to-personal";
  targetLabel: string;
  count: number;
};

export function MigrateControls({ direction, targetLabel, count }: Props) {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    migrateEntriesAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [allSelected, setAllSelected] = useState(false);

  function toggleAll(checked: boolean) {
    setAllSelected(checked);
    document
      .querySelectorAll<HTMLInputElement>('input[name="entryId"]')
      .forEach((input) => {
        input.checked = checked;
      });
  }

  function gatherSelected(): string[] {
    return Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="entryId"]:checked'),
    ).map((input) => input.value);
  }

  function submitSelected() {
    const input = formRef.current?.querySelector<HTMLInputElement>('input[name="ids"]');
    if (input) {
      input.value = JSON.stringify(gatherSelected());
    }
    formRef.current?.requestSubmit();
  }

  function submitAll() {
    const input = formRef.current?.querySelector<HTMLInputElement>('input[name="ids"]');
    if (input) {
      input.value = "";
    }
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} className="migrate-controls">
      {state?.error ? <p className="error">{state.error}</p> : null}
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="ids" value="" />
      <div className="btn-row">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => toggleAll(event.target.checked)}
            disabled={count === 0}
          />
          <span>Select all ({count})</span>
        </label>
        <button
          className="btn btn-small"
          type="button"
          onClick={submitSelected}
          disabled={pending}
        >
          Move selected to {targetLabel}
        </button>
        <button
          className="btn btn-small btn-ghost"
          type="button"
          onClick={submitAll}
          disabled={pending || count === 0}
        >
          Move all to {targetLabel}
        </button>
      </div>
    </form>
  );
}
