"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { editScope, saleQueryWhere, saleScope, type UserContext } from "@/lib/sales-service";
import { requireVerifiedUser } from "@/lib/session";
import { computeTotals, SaleValidationError, type LineInput } from "@/lib/totals";

export type SaleActionState = { error?: string } | null;

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

const lineSchema = z.object({
  name: z.string(),
  quantity: z.number().int(),
  unitPrice: z.string(),
});

function parseSoldAt(raw: string): Date {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new SaleValidationError("Sale date is invalid.");
  }
  return date;
}

function parseTaxRateBps(raw: string): number {
  const percent = Number(raw);
  if (!Number.isFinite(percent)) {
    throw new SaleValidationError("Tax rate must be a number.");
  }
  return Math.round(percent * 100);
}

function parseLines(formData: FormData): LineInput[] {
  const raw = String(formData.get("lines") ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SaleValidationError("Line items could not be read.");
  }
  const lines = z.array(lineSchema).safeParse(parsed);
  if (!lines.success) {
    throw new SaleValidationError("Line items are invalid.");
  }
  return lines.data.map((line) => ({
    name: line.name,
    quantity: line.quantity,
    unitPriceCents: parseCents(line.unitPrice),
  }));
}

function optionalText(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

function readSaleForm(formData: FormData) {
  const soldAt = parseSoldAt(String(formData.get("soldAt") ?? ""));
  const taxRateBps = parseTaxRateBps(String(formData.get("taxRate") ?? "0"));
  const note = String(formData.get("note") ?? "").trim();
  const receiverName = optionalText(formData, "receiverName");
  const receiverAccount = optionalText(formData, "receiverAccount");
  const receiverContact = optionalText(formData, "receiverContact");
  const receiverAddress = optionalText(formData, "receiverAddress");
  const lines = parseLines(formData);
  const totals = computeTotals(lines, taxRateBps);
  return {
    soldAt,
    taxRateBps,
    note,
    receiverName,
    receiverAccount,
    receiverContact,
    receiverAddress,
    totals,
  };
}

export async function createSale(
  prevState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const user = await requireVerifiedUser();
  try {
    const { soldAt, taxRateBps, note, receiverName, receiverAccount, receiverContact, receiverAddress, totals } =
      readSaleForm(formData);
    await prisma.transaction.create({
      data: {
        soldAt,
        note,
        taxRateBps,
        receiverName,
        receiverAccount,
        receiverContact,
        receiverAddress,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        createdById: user.userId,
        ledgerOrgId: user.activeOrgId,
        lines: {
          create: totals.lines.map((line, index) => ({
            name: line.name,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            lineTotalCents: line.lineTotalCents,
            sortOrder: index,
          })),
        },
      },
    });
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message) {
      return { error: error.message };
    }
    return { error: "Could not save the sale." };
  }
  revalidatePath("/sales");
  redirect("/sales");
}

export async function updateSale(
  prevState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const user = await requireVerifiedUser();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Missing sale id." };
  }
  try {
    const existing = await prisma.transaction.findUnique({
      where: { id, ...editScope(userContext(user)) },
    });
    if (!existing) {
      return { error: "Sale not found." };
    }
    const { soldAt, taxRateBps, note, receiverName, receiverAccount, receiverContact, receiverAddress, totals } =
      readSaleForm(formData);
    await prisma.transaction.update({
      where: { id },
      data: {
        soldAt,
        note,
        taxRateBps,
        receiverName,
        receiverAccount,
        receiverContact,
        receiverAddress,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        lines: {
          deleteMany: {},
          create: totals.lines.map((line, index) => ({
            name: line.name,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            lineTotalCents: line.lineTotalCents,
            sortOrder: index,
          })),
        },
      },
    });
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message) {
      return { error: error.message };
    }
    return { error: "Could not update the sale." };
  }
  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  redirect(`/sales/${id}`);
}

export async function deleteSale(formData: FormData) {
  const user = await requireVerifiedUser();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return;
  }
  await prisma.transaction.deleteMany({ where: { id, ...editScope(userContext(user)) } });
  revalidatePath("/sales");
  redirect("/sales");
}

export async function listSales(params: { q?: string; from?: string; to?: string }) {
  const user = await requireVerifiedUser();
  return prisma.transaction.findMany({
    where: saleQueryWhere(userContext(user), params),
    include: {
      createdBy: { select: { id: true, username: true } },
      lines: { select: { id: true } },
    },
    orderBy: { soldAt: "desc" },
  });
}

export async function getSale(id: string) {
  const user = await requireVerifiedUser();
  return prisma.transaction.findUnique({
    where: { id, ...saleScope(userContext(user)) },
    include: {
      createdBy: { select: { id: true, username: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
}
