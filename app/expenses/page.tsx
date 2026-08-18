import Link from "next/link";
import { listExpenses } from "@/app/actions/expenses";
import { requireUser } from "@/lib/session";
import { formatCents, formatSoldAt } from "@/lib/money";
import { ExpenseForm } from "@/components/ExpenseForm";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from = "", to = "" } = await searchParams;
  const user = await requireUser();
  const expenses = await listExpenses({ from, to });
  const totalCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);

  return (
    <main className="main">
      <div className="page-head">
        <div>
          <h1>Expenses</h1>
          <p className="lede">Money going out — used by the analytics on the sales dashboard.</p>
        </div>
        <div className="btn-row page-actions">
          <Link className="btn btn-secondary" href="/sales">
            Back to sales
          </Link>
        </div>
      </div>

      <div className="expenses-layout">
        <ExpenseForm />

        <section className="card expenses-list">
          <div className="card-head">
            <h2>
              Expenses <span className="muted">({expenses.length})</span>
            </h2>
            <span className="total-chip">{formatCents(totalCents)}</span>
          </div>
          {expenses.length === 0 ? (
            <p className="empty-note">No expenses yet — record the first one.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Note</th>
                  {user.organizationId ? <th>Agent</th> : null}
                  <th className="num">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatSoldAt(expense.spentAt)}</td>
                    <td>{expense.note || "—"}</td>
                    {user.organizationId ? <td>{expense.createdBy.username}</td> : null}
                    <td className="num">{formatCents(expense.amountCents)}</td>
                    <td className="actions-cell">
                      <DeleteExpenseButton id={expense.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}