"use client";

import { deleteSale } from "@/app/actions/sales";

export function DeleteSaleButton({ id }: { id: string }) {
  return (
    <form
      action={deleteSale}
      onSubmit={(event) => {
        if (!window.confirm("Delete this sale? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <div className="btn-row">
        <button className="btn btn-danger" type="submit">
          Delete sale
        </button>
      </div>
    </form>
  );
}
