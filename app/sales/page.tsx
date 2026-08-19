import Link from "next/link";
import { listSales } from "@/app/actions/sales";
import { formatCents, formatSoldAt } from "@/lib/money";
import { requireVerifiedUser } from "@/lib/session";
import { getAnalytics } from "@/lib/analytics";
import { RevenueChart } from "@/components/RevenueChart";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q = "", from = "", to = "" } = await searchParams;
  const user = await requireVerifiedUser();
  const [sales, analytics] = await Promise.all([
    listSales({ q, from, to }),
    getAnalytics({ id: user.userId, organizationId: user.organizationId }, { from, to }),
  ]);
  const { totals } = analytics;
  const hasActivity = totals.saleCount + totals.expenseCount > 0;

  return (
    <main className="main">
      <div className="page-head">
        <div>
          <h1>Sales dashboard</h1>
          <p className="lede">Your recorded transactions, with revenue and expense analytics.</p>
        </div>
        <div className="btn-row page-actions">
          <Link className="btn btn-secondary" href="/expenses">
            Expenses
          </Link>
          <Link className="btn" href="/sales/new">
            Record sale
          </Link>
          <Link className="btn btn-secondary" href="/sales/scan">
            Scan receipt
          </Link>
        </div>
      </div>

      <section className="analytics">
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Revenue</span>
            <span className="stat-value stat-incoming">{formatCents(totals.revenueCents)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Expenses</span>
            <span className="stat-value stat-outgoing">{formatCents(totals.expenseCents)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Net</span>
            <span className="stat-value">{formatCents(totals.netCents)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Sales</span>
            <span className="stat-value">{totals.saleCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Avg per sale</span>
            <span className="stat-value">{formatCents(totals.averageSaleCents)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Items sold</span>
            <span className="stat-value">{totals.itemsSold}</span>
          </div>
        </div>

        {!hasActivity ? (
          <div className="card empty-panel">
            <h2>No activity yet</h2>
            <p>
              {from || to
                ? "No sales or expenses in this date range."
                : "No sales or expenses yet — record your first sale or expense."}
            </p>
            <div className="btn-row">
              <Link className="btn" href="/sales/new">
                Record sale
              </Link>
              <Link className="btn btn-secondary" href="/expenses">
                Add expense
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="chart-row">
              <div className="card chart-card">
                <div className="card-head">
                  <h2>Revenue vs expenses</h2>
                  <div className="chart-legend">
                    <span className="legend-item">
                      <span className="legend-dot legend-revenue" aria-hidden="true" />
                      Revenue
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot legend-expense" aria-hidden="true" />
                      Expenses
                    </span>
                  </div>
                </div>
                <RevenueChart series={analytics.series} />
              </div>

              {analytics.topItems.length > 0 ? (
                <div className="card top-items">
                  <div className="card-head">
                    <h2>Top items</h2>
                  </div>
                  <ol>
                    {analytics.topItems.map((item, index) => (
                      <li key={item.name}>
                        <span className="top-rank">{index + 1}</span>
                        <span className="top-name">{item.name}</span>
                        <span className="top-qty">{item.quantity} sold</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>

            {analytics.byAgent && analytics.byAgent.length > 0 ? (
              <div className="card table-wrap">
                <div className="card-head">
                  <h2>By agent</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th className="num">Sales</th>
                      <th className="num">Incoming</th>
                      <th className="num">Expenses</th>
                      <th className="num">Outgoing</th>
                      <th className="num">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.byAgent.map((agent) => (
                      <tr key={agent.username}>
                        <td>{agent.username}</td>
                        <td className="num">{agent.saleCount}</td>
                        <td className="num">{formatCents(agent.revenueCents)}</td>
                        <td className="num">{agent.expenseCount}</td>
                        <td className="num">{formatCents(agent.expenseCents)}</td>
                        <td className="num">{formatCents(agent.netCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </section>

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