import { prisma } from "@/lib/prisma";
import { saleScope, saleListWhere, type UserContext } from "@/lib/sales-service";
import { expenseListWhere } from "@/lib/expenses";

export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildDayRange(from?: string, to?: string, fallbackDays = 30): string[] {
  const end = to ? new Date(`${to}T12:00:00`) : new Date();
  const start = from
    ? new Date(`${from}T12:00:00`)
    : new Date(end.getTime() - (fallbackDays - 1) * 24 * 60 * 60 * 1000);
  const keys: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    keys.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export type SaleAnalyticsRow = {
  soldAt: Date;
  totalCents: number;
  taxCents: number;
  createdById: string;
  createdBy?: { username: string } | null;
  lines?: Array<{ name: string; quantity: number }>;
};

export type ExpenseAnalyticsRow = {
  spentAt: Date;
  amountCents: number;
  createdById: string;
  createdBy?: { username: string } | null;
};

export type AnalyticsTotals = {
  revenueCents: number;
  expenseCents: number;
  netCents: number;
  saleCount: number;
  expenseCount: number;
  averageSaleCents: number;
  taxCents: number;
  itemsSold: number;
};

export type DayPoint = {
  key: string;
  revenueCents: number;
  expenseCents: number;
};

export type AgentAnalyticsRow = {
  username: string;
  saleCount: number;
  expenseCount: number;
  revenueCents: number;
  expenseCents: number;
  netCents: number;
};

export type TopItemRow = {
  name: string;
  quantity: number;
};

export type Analytics = {
  totals: AnalyticsTotals;
  series: DayPoint[];
  byAgent: AgentAnalyticsRow[] | null;
  topItems: TopItemRow[];
};

export function aggregateAnalytics(
  sales: SaleAnalyticsRow[],
  expenses: ExpenseAnalyticsRow[],
  options: { organizationId: string | null; dayKeys: string[] },
): Analytics {
  const revenueCents = sales.reduce((sum, sale) => sum + sale.totalCents, 0);
  const taxCents = sales.reduce((sum, sale) => sum + sale.taxCents, 0);
  const expenseCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const itemsSold = sales.reduce(
    (sum, sale) => sum + (sale.lines ?? []).reduce((lineSum, line) => lineSum + line.quantity, 0),
    0,
  );
  const saleCount = sales.length;
  const expenseCount = expenses.length;

  const dayMap = new Map<string, DayPoint>();
  for (const key of options.dayKeys) {
    dayMap.set(key, { key, revenueCents: 0, expenseCents: 0 });
  }
  for (const sale of sales) {
    const key = dayKey(sale.soldAt);
    const point = dayMap.get(key);
    if (point) {
      point.revenueCents += sale.totalCents;
    }
  }
  for (const expense of expenses) {
    const key = dayKey(expense.spentAt);
    const point = dayMap.get(key);
    if (point) {
      point.expenseCents += expense.amountCents;
    }
  }

  let byAgent: AgentAnalyticsRow[] | null = null;
  if (options.organizationId) {
    const agentMap = new Map<string, AgentAnalyticsRow>();
    for (const sale of sales) {
      const name = sale.createdBy?.username ?? sale.createdById;
      const row = agentMap.get(name) ?? {
        username: name,
        saleCount: 0,
        expenseCount: 0,
        revenueCents: 0,
        expenseCents: 0,
        netCents: 0,
      };
      row.saleCount += 1;
      row.revenueCents += sale.totalCents;
      agentMap.set(name, row);
    }
    for (const expense of expenses) {
      const name = expense.createdBy?.username ?? expense.createdById;
      const row = agentMap.get(name) ?? {
        username: name,
        saleCount: 0,
        expenseCount: 0,
        revenueCents: 0,
        expenseCents: 0,
        netCents: 0,
      };
      row.expenseCount += 1;
      row.expenseCents += expense.amountCents;
      agentMap.set(name, row);
    }
    byAgent = [...agentMap.values()]
      .map((row) => ({ ...row, netCents: row.revenueCents - row.expenseCents }))
      .sort((a, b) => b.revenueCents - a.revenueCents);
  }

  const itemMap = new Map<string, number>();
  for (const sale of sales) {
    for (const line of sale.lines ?? []) {
      itemMap.set(line.name, (itemMap.get(line.name) ?? 0) + line.quantity);
    }
  }
  const topItems = [...itemMap.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    totals: {
      revenueCents,
      expenseCents,
      netCents: revenueCents - expenseCents,
      saleCount,
      expenseCount,
      averageSaleCents: saleCount > 0 ? Math.round(revenueCents / saleCount) : 0,
      taxCents,
      itemsSold,
    },
    series: [...dayMap.values()],
    byAgent,
    topItems,
  };
}

export async function getAnalytics(
  user: UserContext,
  params: { from?: string; to?: string },
): Promise<Analytics> {
  const [sales, expenses] = await Promise.all([
    prisma.transaction.findMany({
      where: { ...saleScope(user), ...saleListWhere({ from: params.from, to: params.to }) },
      select: {
        soldAt: true,
        totalCents: true,
        taxCents: true,
        createdById: true,
        createdBy: { select: { username: true } },
        lines: { select: { name: true, quantity: true } },
      },
    }),
    prisma.expense.findMany({
      where: expenseListWhere(user, { from: params.from, to: params.to }),
      select: {
        spentAt: true,
        amountCents: true,
        createdById: true,
        createdBy: { select: { username: true } },
      },
    }),
  ]);
  return aggregateAnalytics(sales, expenses, {
    organizationId: user.activeOrgId,
    dayKeys: buildDayRange(params.from, params.to),
  });
}