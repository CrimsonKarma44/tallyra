import { z } from "zod";
import { getCurrency } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { computeTotals, SaleValidationError, type LineInput } from "@/lib/totals";

const lineInputSchema = z.object({
  name: z.string(),
  quantity: z.number().int(),
  unitPrice: z.union([z.number(), z.string()]),
});

export const saleWriteSchema = z.object({
  soldAt: z.string().optional(),
  note: z.string().optional(),
  taxRate: z.number().optional(),
  receiverName: z.string().nullable().optional(),
  receiverAccount: z.string().nullable().optional(),
  receiverContact: z.string().nullable().optional(),
  receiverAddress: z.string().nullable().optional(),
  lines: z.array(lineInputSchema).min(1),
});

export type SaleWriteInput = z.infer<typeof saleWriteSchema>;

const saleInclude = {
  createdBy: { select: { id: true, username: true } },
  lines: { orderBy: { sortOrder: "asc" as const } },
};

function pesosToCents(raw: number | string): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new SaleValidationError("Unit price must be a number of 0 or more.");
  }
  return Math.round(value * 100);
}

function optionalField(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export function parseSaleWrite(input: unknown) {
  const parsed = saleWriteSchema.safeParse(input);
  if (!parsed.success) {
    throw new SaleValidationError("Sale payload is invalid. Provide lines with name, quantity, and unitPrice.");
  }
  const data = parsed.data;
  const soldAt = data.soldAt ? new Date(data.soldAt) : new Date();
  if (Number.isNaN(soldAt.getTime())) {
    throw new SaleValidationError("soldAt is invalid.");
  }
  const taxRate = data.taxRate ?? 0;
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    throw new SaleValidationError("taxRate must be between 0 and 100.");
  }
  const taxRateBps = Math.round(taxRate * 100);
  const lines: LineInput[] = data.lines.map((line) => ({
    name: line.name,
    quantity: line.quantity,
    unitPriceCents: pesosToCents(line.unitPrice),
  }));
  const totals = computeTotals(lines, taxRateBps);
  return {
    soldAt,
    note: data.note?.trim() ?? "",
    taxRateBps,
    receiverName: optionalField(data.receiverName),
    receiverAccount: optionalField(data.receiverAccount),
    receiverContact: optionalField(data.receiverContact),
    receiverAddress: optionalField(data.receiverAddress),
    totals,
  };
}

export function serializeSale(
  sale: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    soldAt: Date;
    note: string;
    taxRateBps: number;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    receiverName: string | null;
    receiverAccount: string | null;
    receiverContact: string | null;
    receiverAddress: string | null;
    createdBy: { id: string; username: string };
    lines: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
    }>;
  },
) {
  const currency = getCurrency();
  return {
    id: sale.id,
    soldAt: sale.soldAt.toISOString(),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    note: sale.note,
    taxRate: sale.taxRateBps / 100,
    currency,
    subtotal: sale.subtotalCents / 100,
    tax: sale.taxCents / 100,
    total: sale.totalCents / 100,
    receiver: {
      name: sale.receiverName,
      account: sale.receiverAccount,
      contact: sale.receiverContact,
      address: sale.receiverAddress,
    },
    createdBy: sale.createdBy,
    lines: sale.lines.map((line) => ({
      id: line.id,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPriceCents / 100,
      lineTotal: line.lineTotalCents / 100,
    })),
  };
}

export function saleListWhere(params: { q?: string; from?: string; to?: string }) {
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
  return where;
}

export type UserContext = {
  id: string;
  organizationId: string | null;
  activeOrgId: string | null;
  isOrgAdmin: boolean;
};

export type LedgerContextOptions = {
  activeOrgId?: string | null;
};

export async function resolveUserContext(
  userId: string,
  opts?: LedgerContextOptions,
): Promise<UserContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (!user?.organizationId) {
    return {
      id: userId,
      organizationId: null,
      activeOrgId: opts?.activeOrgId ?? null,
      isOrgAdmin: false,
    };
  }
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { adminId: true },
  });
  return {
    id: userId,
    organizationId: user.organizationId,
    activeOrgId: opts?.activeOrgId === undefined ? user.organizationId : opts.activeOrgId,
    isOrgAdmin: org?.adminId === userId,
  };
}

export function saleScope(user: UserContext) {
  if (!user.activeOrgId) {
    return { createdById: user.id, ledgerOrgId: null };
  }
  return user.isOrgAdmin
    ? { ledgerOrgId: user.activeOrgId }
    : { ledgerOrgId: user.activeOrgId, createdById: user.id };
}

export function editScope(user: UserContext) {
  return saleScope(user);
}

export function saleQueryWhere(user: UserContext, params: { q?: string; from?: string; to?: string }) {
  return { ...saleScope(user), ...saleListWhere(params) };
}

export async function listSalesRecords(
  userId: string,
  params: { q?: string; from?: string; to?: string },
  opts?: LedgerContextOptions,
) {
  const user = await resolveUserContext(userId, opts);
  return prisma.transaction.findMany({
    where: saleQueryWhere(user, params),
    include: saleInclude,
    orderBy: { soldAt: "desc" },
  });
}

export async function getSaleRecord(id: string, userId: string, opts?: LedgerContextOptions) {
  const user = await resolveUserContext(userId, opts);
  return prisma.transaction.findUnique({
    where: { id, ...saleScope(user) },
    include: saleInclude,
  });
}

export async function createSaleRecord(userId: string, input: unknown, opts?: LedgerContextOptions) {
  const user = await resolveUserContext(userId, opts);
  const parsed = parseSaleWrite(input);
  return prisma.transaction.create({
    data: {
      soldAt: parsed.soldAt,
      note: parsed.note,
      taxRateBps: parsed.taxRateBps,
      receiverName: parsed.receiverName,
      receiverAccount: parsed.receiverAccount,
      receiverContact: parsed.receiverContact,
      receiverAddress: parsed.receiverAddress,
      subtotalCents: parsed.totals.subtotalCents,
      taxCents: parsed.totals.taxCents,
      totalCents: parsed.totals.totalCents,
      createdById: userId,
      ledgerOrgId: user.activeOrgId,
      lines: {
        create: parsed.totals.lines.map((line, index) => ({
          name: line.name,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          lineTotalCents: line.lineTotalCents,
          sortOrder: index,
        })),
      },
    },
    include: saleInclude,
  });
}

export async function updateSaleRecord(
  id: string,
  userId: string,
  input: unknown,
  opts?: LedgerContextOptions,
) {
  const user = await resolveUserContext(userId, opts);
  const existing = await prisma.transaction.findUnique({ where: { id, ...editScope(user) } });
  if (!existing) {
    return null;
  }
  const parsed = parseSaleWrite(input);
  return prisma.transaction.update({
    where: { id },
    data: {
      soldAt: parsed.soldAt,
      note: parsed.note,
      taxRateBps: parsed.taxRateBps,
      receiverName: parsed.receiverName,
      receiverAccount: parsed.receiverAccount,
      receiverContact: parsed.receiverContact,
      receiverAddress: parsed.receiverAddress,
      subtotalCents: parsed.totals.subtotalCents,
      taxCents: parsed.totals.taxCents,
      totalCents: parsed.totals.totalCents,
      lines: {
        deleteMany: {},
        create: parsed.totals.lines.map((line, index) => ({
          name: line.name,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          lineTotalCents: line.lineTotalCents,
          sortOrder: index,
        })),
      },
    },
    include: saleInclude,
  });
}

export async function deleteSaleRecord(id: string, userId: string, opts?: LedgerContextOptions) {
  try {
    const user = await resolveUserContext(userId, opts);
    const result = await prisma.transaction.deleteMany({ where: { id, ...editScope(user) } });
    return result.count > 0;
  } catch {
    return false;
  }
}
