import { z } from "zod";
import { pesosToCents } from "@/lib/money";
import { saleScope, type UserContext } from "@/lib/sales-service";

export class ExpenseValidationError extends Error {}

export const EXPENSE_NOTE_MAX = 200;

const expenseWriteSchema = z.object({
  spentAt: z.string().optional(),
  note: z.string().optional(),
  amount: z.union([z.number(), z.string()]),
});

export type ExpenseWriteInput = z.infer<typeof expenseWriteSchema>;

export function parseExpenseWrite(input: unknown) {
  const parsed = expenseWriteSchema.safeParse(input);
  if (!parsed.success) {
    throw new ExpenseValidationError("Provide an amount for the expense.");
  }
  const data = parsed.data;
  const spentAt = data.spentAt ? new Date(data.spentAt) : new Date();
  if (Number.isNaN(spentAt.getTime())) {
    throw new ExpenseValidationError("Expense date is invalid.");
  }
  let amountCents: number;
  try {
    amountCents = pesosToCents(String(data.amount));
  } catch {
    throw new ExpenseValidationError("Amount must be greater than zero.");
  }
  if (amountCents <= 0) {
    throw new ExpenseValidationError("Amount must be greater than zero.");
  }
  const note = data.note?.trim() ?? "";
  if (note.length > EXPENSE_NOTE_MAX) {
    throw new ExpenseValidationError(`Note must be ${EXPENSE_NOTE_MAX} characters or fewer.`);
  }
  return { spentAt, amountCents, note };
}

export function expenseListWhere(
  user: Pick<UserContext, "id" | "organizationId">,
  params: { from?: string; to?: string },
) {
  const where: {
    spentAt?: { gte?: Date; lte?: Date };
  } & ReturnType<typeof saleScope> = { ...saleScope(user) };
  if (params.from || params.to) {
    where.spentAt = {};
    if (params.from) {
      where.spentAt.gte = new Date(`${params.from}T00:00:00`);
    }
    if (params.to) {
      where.spentAt.lte = new Date(`${params.to}T23:59:59.999`);
    }
  }
  return where;
}
