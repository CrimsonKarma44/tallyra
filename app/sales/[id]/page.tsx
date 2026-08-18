import { notFound } from "next/navigation";
import { getSale, updateSale } from "@/app/actions/sales";
import { DeleteSaleButton } from "@/components/DeleteSaleButton";
import { SaleForm } from "@/components/SaleForm";
import { formatCents, formatSoldAt } from "@/lib/money";
import { requireUser } from "@/lib/session";

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const sale = await getSale(id);
  if (!sale) {
    notFound();
  }
  const canEdit = user.isOrgAdmin || sale.createdBy.id === user.userId;

  if (!canEdit) {
    return (
      <main className="main">
        <div className="sale-card">
          <h1>Sale details</h1>
          <div className="meta">
            <span>Recorded by {sale.createdBy.username}</span>
            <span>Sold {formatSoldAt(sale.soldAt)}</span>
            {sale.note ? <span>{sale.note}</span> : null}
          </div>
          <table className="lines">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Line total</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.name}</td>
                  <td className="num">{line.quantity}</td>
                  <td className="num">{formatCents(line.unitPriceCents)}</td>
                  <td className="num">{formatCents(line.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="totals-panel">
            <div className="totals-row">
              <span>Subtotal</span>
              <strong>{formatCents(sale.subtotalCents)}</strong>
            </div>
            <div className="totals-row">
              <span>Tax ({sale.taxRateBps / 100}%)</span>
              <strong>{formatCents(sale.taxCents)}</strong>
            </div>
            <div className="totals-row grand">
              <span>Total</span>
              <strong>{formatCents(sale.totalCents)}</strong>
            </div>
          </div>
        </div>
      </main>
    );
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