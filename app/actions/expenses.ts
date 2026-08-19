"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireVerifiedUser } from "@/lib/session";
import { ExpenseValidationError, expenseListWhere, parseExpenseWrite } from "@/lib/expenses";
import { editScope, type UserContext } from "@/lib/sales-service";

export type ExpenseActionState = { error?: string } | null;

function userContext(user: {
  userId: string;
  organizationId: string | null;
  activeOrgId: string | null;
  isOrgAdmin: boolean;
}): UserContext {
  return {
    id: user.userId,
    organizationId: user.organizationId,
    activeOrgId: user.activeOrgId,
    isOrgAdmin: user.isOrgAdmin,
  };
}

export async function createExpense(
  prevState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const user = await requireVerifiedUser();
  try {
    const { spentAt, amountCents, note } = parseExpenseWrite({
      spentAt: String(formData.get("spentAt") ?? "") || undefined,
      amount: String(formData.get("amount") ?? ""),
      note: String(formData.get("note") ?? ""),
    });
    await prisma.expense.create({
      data: { spentAt, amountCents, note, createdById: user.userId, ledgerOrgId: user.activeOrgId },
    });
  } catch (error) {
    if (error instanceof ExpenseValidationError) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message) {
      return { error: error.message };
    }
    return { error: "Could not save the expense." };
  }
  revalidatePath("/expenses");
  revalidatePath("/sales");
  redirect("/expenses");
}

export async function deleteExpense(formData: FormData) {
  const user = await requireVerifiedUser();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return;
  }
  await prisma.expense.deleteMany({
    where: { id, ...editScope(userContext(user)) },
  });
  revalidatePath("/expenses");
  revalidatePath("/sales");
  redirect("/expenses");
}

export async function listExpenses(params: { from?: string; to?: string }) {
  const user = await requireVerifiedUser();
  return prisma.expense.findMany({
    where: expenseListWhere(userContext(user), params),
    include: { createdBy: { select: { id: true, username: true } } },
    orderBy: { spentAt: "desc" },
  });
}