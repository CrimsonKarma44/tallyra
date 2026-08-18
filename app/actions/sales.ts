"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { pesosToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { computeTotals, SaleValidationError, type LineInput } from "@/lib/totals";

export type SaleActionState = { error?: string } | null;

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
    unitPriceCents: pesosToCents(line.unitPrice),
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
  const user = await requireUser();
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
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Missing sale id." };
  }
  try {
    const existing = await prisma.transaction.findUnique({ where: { id } });
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
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return;
  }
  await prisma.transaction.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/sales");
  redirect("/sales");
}

export async function listSales(params: { q?: string; from?: string; to?: string }) {
  await requireUser();
  const where: {
    soldAt?: { gte?: Date; lte?: Date };
    OR?: Array<
      | { note: { contains: string } }
      | { createdBy: { username: { contains: string } } }
      | { receiverName: { contains: string } }
      | { receiverAccount: { contains: string } }
      | { lines: { some: { name: { contains: string } } } }
    >;
  } = {};

  if (params.from || params.to) {
    where.soldAt = {};
    if (params.from) {
      where.soldAt.gte = new Date(`${params.from}T00:00:00`);
    }
    if (params.to) {
      where.soldAt.lte = new Date(`${params.to}T23:59:59.999`);
    }
  }

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { note: { contains: q } },
      { createdBy: { username: { contains: q } } },
      { receiverName: { contains: q } },
      { receiverAccount: { contains: q } },
      { lines: { some: { name: { contains: q } } } },
    ];
  }

  return prisma.transaction.findMany({
    where,
    include: {
      createdBy: { select: { username: true } },
      lines: { select: { id: true } },
    },
    orderBy: { soldAt: "desc" },
  });
}

export async function getSale(id: string) {
  await requireUser();
  return prisma.transaction.findUnique({
    where: { id },
    include: {
      createdBy: { select: { username: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
}
