import { z } from "zod";
import { getCurrency, parseCents } from "@/lib/money";
import {
  editScope,
  resolveUserContext,
  saleScope,
  type LedgerContextOptions,
  type UserContext,
} from "@/lib/sales-service";
import { prisma } from "@/lib/prisma";

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
    amountCents = parseCents(String(data.amount));
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
  user: UserContext,
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

const expenseInclude = {
  createdBy: { select: { id: true, username: true } },
};

export function serializeExpense(
  expense: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    spentAt: Date;
    amountCents: number;
    note: string;
    createdBy: { id: string; username: string };
  },
) {
  return {
    id: expense.id,
    spentAt: expense.spentAt.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    amount: expense.amountCents / 100,
    currency: getCurrency(),
    note: expense.note,
    createdBy: expense.createdBy,
  };
}

export async function listExpensesRecords(
  userId: string,
  params: { from?: string; to?: string },
  opts?: LedgerContextOptions,
) {
  const user = await resolveUserContext(userId, opts);
  return prisma.expense.findMany({
    where: expenseListWhere(user, params),
    include: expenseInclude,
    orderBy: { spentAt: "desc" },
  });
}

export async function getExpenseRecord(id: string, userId: string, opts?: LedgerContextOptions) {
  const user = await resolveUserContext(userId, opts);
  return prisma.expense.findUnique({
    where: { id, ...saleScope(user) },
    include: expenseInclude,
  });
}

export async function createExpenseRecord(
  userId: string,
  input: unknown,
  opts?: LedgerContextOptions,
) {
  const user = await resolveUserContext(userId, opts);
  const parsed = parseExpenseWrite(input);
  return prisma.expense.create({
    data: {
      spentAt: parsed.spentAt,
      amountCents: parsed.amountCents,
      note: parsed.note,
      createdById: userId,
      ledgerOrgId: user.activeOrgId,
    },
    include: expenseInclude,
  });
}

export async function updateExpenseRecord(
  id: string,
  userId: string,
  input: unknown,
  opts?: LedgerContextOptions,
) {
  const user = await resolveUserContext(userId, opts);
  const existing = await prisma.expense.findUnique({ where: { id, ...editScope(user) } });
  if (!existing) {
    return null;
  }
  const parsed = parseExpenseWrite(input);
  return prisma.expense.update({
    where: { id },
    data: { spentAt: parsed.spentAt, amountCents: parsed.amountCents, note: parsed.note },
    include: expenseInclude,
  });
}

export async function deleteExpenseRecord(
  id: string,
  userId: string,
  opts?: LedgerContextOptions,
) {
  try {
    const user = await resolveUserContext(userId, opts);
    const result = await prisma.expense.deleteMany({ where: { id, ...editScope(user) } });
    return result.count > 0;
  } catch {
    return false;
  }
}
