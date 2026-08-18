import { createSale } from "@/app/actions/sales";
import { SaleForm } from "@/components/SaleForm";
import { requireUser } from "@/lib/session";

export default async function NewSalePage() {
  await requireUser();
  return (
    <main className="main">
      <div className="sale-card">
        <h1>Record sale</h1>
        <p className="lede">Type the items from this transaction. Totals update as you type.</p>
        <SaleForm
          action={createSale}
          submitLabel="Save sale"
          initial={{
            soldAt: new Date(),
            note: "",
            taxRateBps: 0,
            lines: [],
          }}
        />
      </div>
    </main>
  );
}
