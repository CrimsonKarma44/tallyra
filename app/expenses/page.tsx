import Link from "next/link";
import { listExpenses } from "@/app/actions/expenses";
import { requireVerifiedUser } from "@/lib/session";
import { formatCents, formatSoldAt } from "@/lib/money";
import { ExpenseForm } from "@/components/ExpenseForm";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { MigrateControls } from "@/components/MigrateControls";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from = "", to = "" } = await searchParams;
  const user = await requireVerifiedUser();
  const expenses = await listExpenses({ from, to });
  const totalCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const showAgent = Boolean(user.activeOrgId && user.isOrgAdmin);
  const migrateTarget = user.organizationId
    ? user.activeOrgId
      ? user.isOrgAdmin
        ? { direction: "to-personal" as const, targetLabel: "your personal ledger" }
        : null
      : { direction: "to-org" as const, targetLabel: "the organization" }
    : null;
  const migrateCount =
    migrateTarget?.direction === "to-personal"
      ? expenses.filter((expense) => expense.createdBy.id === user.userId).length
      : expenses.length;

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

        {migrateTarget && migrateCount > 0 ? (
          <MigrateControls
            direction={migrateTarget.direction}
            targetLabel={migrateTarget.targetLabel}
            count={migrateCount}
          />
        ) : null}
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
                  {migrateTarget ? <th></th> : null}
                  <th>Date</th>
                  <th>Note</th>
                  {showAgent ? <th>Agent</th> : null}
                  <th className="num">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    {migrateTarget ? (
                      <td>
                        <input
                          type="checkbox"
                          name="entryId"
                          value={expense.id}
                          disabled={
                            migrateTarget.direction === "to-personal" &&
                            expense.createdBy.id !== user.userId
                          }
                        />
                      </td>
                    ) : null}
                    <td>{formatSoldAt(expense.spentAt)}</td>
                    <td>{expense.note || "—"}</td>
                    {showAgent ? <td>{expense.createdBy.username}</td> : null}
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