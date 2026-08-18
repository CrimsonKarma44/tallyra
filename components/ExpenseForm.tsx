"use client";

import { useActionState } from "react";
import { createExpense, type ExpenseActionState } from "@/app/actions/expenses";

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState<ExpenseActionState, FormData>(
    createExpense,
    null,
  );

  return (
    <form action={formAction} className="expense-form">
      <h2>Record an expense</h2>
      <p className="muted">Money going out, tracked against your sales.</p>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <div className="field-row">
        <label>
          Date
          <input name="spentAt" type="date" />
        </label>
        <label>
          Amount
          <input name="amount" type="number" inputMode="decimal" step="0.01" min="0" required placeholder="0.00" />
        </label>
      </div>
      <label>
        Note
        <input name="note" maxLength={200} placeholder="e.g. restock rice, electricity, fare" />
      </label>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add expense"}
        </button>
      </div>
    </form>
  );
}