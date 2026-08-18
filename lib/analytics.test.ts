import { describe, expect, it } from "vitest";
import {
  aggregateAnalytics,
  buildDayRange,
  dayKey,
  type ExpenseAnalyticsRow,
  type SaleAnalyticsRow,
} from "./analytics";

const sale = (
  partial: Partial<SaleAnalyticsRow> & { soldAt: Date },
): SaleAnalyticsRow => ({
  totalCents: 0,
  taxCents: 0,
  createdById: "u1",
  createdBy: { username: "maria" },
  lines: [],
  ...partial,
});

const expense = (
  partial: Partial<ExpenseAnalyticsRow> & { spentAt: Date },
): ExpenseAnalyticsRow => ({
  amountCents: 0,
  createdById: "u1",
  createdBy: { username: "maria" },
  ...partial,
});

describe("dayKey", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    expect(dayKey(new Date("2026-08-05T12:00:00"))).toBe("2026-08-05");
    expect(dayKey(new Date("2026-01-31T12:00:00"))).toBe("2026-01-31");
  });
});

describe("buildDayRange", () => {
  it("builds every day between from and to inclusive", () => {
    expect(buildDayRange("2026-08-01", "2026-08-03")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });

  it("defaults to a trailing window ending today", () => {
    const keys = buildDayRange(undefined, undefined, 7);
    const today = dayKey(new Date());
    expect(keys).toHaveLength(7);
    expect(keys[6]).toBe(today);
  });

  it("starts from from when to is missing", () => {
    const keys = buildDayRange("2026-08-01", undefined, 30);
    expect(keys[0]).toBe("2026-08-01");
  });
});

describe("aggregateAnalytics totals", () => {
  it("computes revenue, expenses, net, counts, average, tax, and items sold", () => {
    const result = aggregateAnalytics(
      [
        sale({ soldAt: new Date("2026-08-01T12:00:00"), totalCents: 2000, taxCents: 100, lines: [{ name: "Rice", quantity: 2 }] }),
        sale({ soldAt: new Date("2026-08-02T12:00:00"), totalCents: 5000, taxCents: 250 }),
      ],
      [expense({ spentAt: new Date("2026-08-01T12:00:00"), amountCents: 1000 })],
      { organizationId: null, dayKeys: buildDayRange("2026-08-01", "2026-08-02") },
    );
    expect(result.totals).toEqual({
      revenueCents: 7000,
      expenseCents: 1000,
      netCents: 6000,
      saleCount: 2,
      expenseCount: 1,
      averageSaleCents: 3500,
      taxCents: 350,
      itemsSold: 2,
    });
  });

  it("returns zeros when there is no data", () => {
    const result = aggregateAnalytics([], [], {
      organizationId: null,
      dayKeys: buildDayRange("2026-08-01", "2026-08-02"),
    });
    expect(result.totals).toEqual({
      revenueCents: 0,
      expenseCents: 0,
      netCents: 0,
      saleCount: 0,
      expenseCount: 0,
      averageSaleCents: 0,
      taxCents: 0,
      itemsSold: 0,
    });
    expect(result.byAgent).toBeNull();
    expect(result.topItems).toEqual([]);
  });
});

describe("aggregateAnalytics series", () => {
  it("zero-fills every day key and assigns revenue and expenses to their day", () => {
    const result = aggregateAnalytics(
      [sale({ soldAt: new Date("2026-08-01T12:00:00"), totalCents: 500 })],
      [expense({ spentAt: new Date("2026-08-02T12:00:00"), amountCents: 300 })],
      { organizationId: null, dayKeys: buildDayRange("2026-08-01", "2026-08-03") },
    );
    expect(result.series).toEqual([
      { key: "2026-08-01", revenueCents: 500, expenseCents: 0 },
      { key: "2026-08-02", revenueCents: 0, expenseCents: 300 },
      { key: "2026-08-03", revenueCents: 0, expenseCents: 0 },
    ]);
  });
});

describe("aggregateAnalytics byAgent", () => {
  it("is null for solo users", () => {
    const result = aggregateAnalytics([sale({ soldAt: new Date("2026-08-01T12:00:00") })], [], {
      organizationId: null,
      dayKeys: buildDayRange("2026-08-01", "2026-08-01"),
    });
    expect(result.byAgent).toBeNull();
  });

  it("breaks down incoming and outgoing per agent for an organization", () => {
    const result = aggregateAnalytics(
      [
        sale({ soldAt: new Date("2026-08-01T12:00:00"), totalCents: 4000, createdById: "u1", createdBy: { username: "maria" } }),
        sale({ soldAt: new Date("2026-08-01T12:00:00"), totalCents: 2000, createdById: "u2", createdBy: { username: "juan" } }),
      ],
      [
        expense({ spentAt: new Date("2026-08-01T12:00:00"), amountCents: 1000, createdById: "u1", createdBy: { username: "maria" } }),
      ],
      { organizationId: "org1", dayKeys: buildDayRange("2026-08-01", "2026-08-01") },
    );
    expect(result.byAgent).toEqual([
      { username: "maria", saleCount: 1, expenseCount: 1, revenueCents: 4000, expenseCents: 1000, netCents: 3000 },
      { username: "juan", saleCount: 1, expenseCount: 0, revenueCents: 2000, expenseCents: 0, netCents: 2000 },
    ]);
  });
});

describe("aggregateAnalytics topItems", () => {
  it("ranks items by quantity sold, capped at five", () => {
    const rows = Array.from({ length: 6 }, (_, index) =>
      sale({
        soldAt: new Date("2026-08-01T12:00:00"),
        lines: [{ name: `item${index}`, quantity: index + 1 }],
      }),
    );
    const result = aggregateAnalytics(rows, [], {
      organizationId: null,
      dayKeys: buildDayRange("2026-08-01", "2026-08-01"),
    });
    expect(result.topItems).toHaveLength(5);
    expect(result.topItems[0].name).toBe("item5");
    expect(result.topItems[0].quantity).toBe(6);
  });

  it("combines quantities for the same item name", () => {
    const result = aggregateAnalytics(
      [
        sale({ soldAt: new Date("2026-08-01T12:00:00"), lines: [{ name: "Rice", quantity: 2 }] }),
        sale({ soldAt: new Date("2026-08-02T12:00:00"), lines: [{ name: "Rice", quantity: 3 }] }),
      ],
      [],
      { organizationId: null, dayKeys: buildDayRange("2026-08-01", "2026-08-02") },
    );
    expect(result.topItems).toEqual([{ name: "Rice", quantity: 5 }]);
  });
});