"use client";

import { deleteExpense } from "@/app/actions/expenses";

export function DeleteExpenseButton({ id }: { id: string }) {
  return (
    <form
      action={deleteExpense}
      onSubmit={(event) => {
        if (!window.confirm("Delete this expense? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-small btn-soft-danger" type="submit">
        Delete
      </button>
    </form>
  );
}