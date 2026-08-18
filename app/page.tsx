import Link from "next/link";
import { listSales } from "@/app/actions/sales";
import { formatCents, formatSoldAt } from "@/lib/money";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q = "", from = "", to = "" } = await searchParams;
  const sales = await listSales({ q, from, to });

  return (
    <main className="main">
      <div className="page-head">
        <div>
          <h1>Sales</h1>
          <p className="lede">Every recorded transaction, with totals computed from line items.</p>
        </div>
        <div className="btn-row page-actions">
          <Link className="btn" href="/sales/new">
            Record sale
          </Link>
          <Link className="btn btn-secondary" href="/sales/scan">
            Scan receipt
          </Link>
        </div>
      </div>

      <form className="filters" method="get">
        <label>
          Search
          <input name="q" defaultValue={q} placeholder="Item, note, receiver, or agent" />
        </label>
        <label>
          From
          <input type="date" name="from" defaultValue={from} />
        </label>
        <label>
          To
          <input type="date" name="to" defaultValue={to} />
        </label>
        <button className="btn btn-secondary" type="submit">
          Filter
        </button>
      </form>

      {sales.length === 0 ? (
        <div className="card empty">
          <p>
            {q || from || to
              ? "No sales match that search."
              : "No sales yet — record the first one."}
          </p>
          <Link className="btn" href="/sales/new">
            Record sale
          </Link>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sold at</th>
                <th>Receiver</th>
                <th>Agent</th>
                <th>Items</th>
                <th>Note</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <Link className="row-link" href={`/sales/${sale.id}`}>
                      {formatSoldAt(sale.soldAt)}
                    </Link>
                  </td>
                  <td>{sale.receiverName || "—"}</td>
                  <td>{sale.createdBy.username}</td>
                  <td>{sale.lines.length}</td>
                  <td>{sale.note || "—"}</td>
                  <td className="num">{formatCents(sale.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
