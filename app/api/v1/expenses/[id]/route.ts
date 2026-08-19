import { json, options, readJson, requireApiLedgerUser } from "@/lib/api-http";
import {
  ExpenseValidationError,
  deleteExpenseRecord,
  getExpenseRecord,
  serializeExpense,
  updateExpenseRecord,
} from "@/lib/expenses";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiLedgerUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  const { id } = await params;
  const expense = await getExpenseRecord(id, auth.user.userId);
  if (!expense) {
    return json({ error: "Expense not found." }, 404);
  }
  return json({ expense: serializeExpense(expense) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiLedgerUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  const { id } = await params;
  try {
    const expense = await updateExpenseRecord(id, auth.user.userId, await readJson(request));
    if (!expense) {
      return json({ error: "Expense not found." }, 404);
    }
    return json({ expense: serializeExpense(expense) });
  } catch (error) {
    if (error instanceof ExpenseValidationError) {
      return json({ error: error.message }, 400);
    }
    return json({ error: "Could not update the expense." }, 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiLedgerUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  const { id } = await params;
  const deleted = await deleteExpenseRecord(id, auth.user.userId);
  if (!deleted) {
    return json({ error: "Expense not found." }, 404);
  }
  return json({ ok: true });
}