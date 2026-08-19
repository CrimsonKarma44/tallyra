import {
  ExpenseValidationError,
  createExpenseRecord,
  listExpensesRecords,
  serializeExpense,
} from "@/lib/expenses";
import { json, options, readJson, requireApiLedgerUser, resolveLedgerScope } from "@/lib/api-http";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const auth = await requireApiLedgerUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  const { searchParams } = new URL(request.url);
  const scope = await resolveLedgerScope(auth.user.userId, searchParams.get("ledger"));
  if (scope.error) {
    return scope.error;
  }
  const expenses = await listExpensesRecords(
    auth.user.userId,
    {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    },
    scope.opts,
  );
  return json({ expenses: expenses.map(serializeExpense) });
}

export async function POST(request: Request) {
  const auth = await requireApiLedgerUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  try {
    const expense = await createExpenseRecord(auth.user.userId, await readJson(request));
    return json({ expense: serializeExpense(expense) }, 201);
  } catch (error) {
    if (error instanceof ExpenseValidationError) {
      return json({ error: error.message }, 400);
    }
    return json({ error: "Could not create the expense." }, 500);
  }
}