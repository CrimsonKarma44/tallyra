import { notFound } from "next/navigation";
import { getSale, updateSale } from "@/app/actions/sales";
import { DeleteSaleButton } from "@/components/DeleteSaleButton";
import { SaleForm } from "@/components/SaleForm";
import { formatCents, formatSoldAt } from "@/lib/money";

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) {
    notFound();
  }

  return (
    <main className="main">
      <div className="sale-card">
        <h1>Edit sale</h1>
        <div className="meta">
          <span>Recorded by {sale.createdBy.username}</span>
          <span>Created {formatSoldAt(sale.createdAt)}</span>
          <span className="money">Stored total {formatCents(sale.totalCents)}</span>
        </div>
        <SaleForm
          action={updateSale}
          submitLabel="Save changes"
          initial={{
            id: sale.id,
            soldAt: sale.soldAt,
            note: sale.note,
            taxRateBps: sale.taxRateBps,
            receiverName: sale.receiverName,
            receiverAccount: sale.receiverAccount,
            receiverContact: sale.receiverContact,
            receiverAddress: sale.receiverAddress,
            lines: sale.lines,
          }}
        />
        <DeleteSaleButton id={sale.id} />
      </div>
    </main>
  );
}
