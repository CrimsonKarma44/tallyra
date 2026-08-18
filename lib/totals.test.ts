import { describe, expect, it } from "vitest";
import { computeLineTotalCents, computeTotals, SaleValidationError } from "./totals";

describe("computeLineTotalCents", () => {
  it("multiplies quantity by unit price", () => {
    expect(computeLineTotalCents(3, 1250)).toBe(3750);
  });
});

describe("computeTotals", () => {
  it("computes a single line with no tax", () => {
    const result = computeTotals([{ name: "Rice", quantity: 2, unitPriceCents: 5000 }], 0);
    expect(result.subtotalCents).toBe(10000);
    expect(result.taxCents).toBe(0);
    expect(result.totalCents).toBe(10000);
    expect(result.lines[0]?.lineTotalCents).toBe(10000);
  });

  it("sums multiple lines", () => {
    const result = computeTotals(
      [
        { name: "Soap", quantity: 1, unitPriceCents: 2500 },
        { name: "Eggs", quantity: 12, unitPriceCents: 800 },
      ],
      0,
    );
    expect(result.subtotalCents).toBe(12100);
    expect(result.totalCents).toBe(12100);
  });

  it("applies 12% tax and rounds half up", () => {
    const result = computeTotals([{ name: "Item", quantity: 1, unitPriceCents: 333 }], 1200);
    expect(result.subtotalCents).toBe(333);
    expect(result.taxCents).toBe(40); // 333 * 0.12 = 39.96 → 40
    expect(result.totalCents).toBe(373);
  });

  it("applies 12% tax on a clean amount", () => {
    const result = computeTotals([{ name: "Item", quantity: 1, unitPriceCents: 10000 }], 1200);
    expect(result.taxCents).toBe(1200);
    expect(result.totalCents).toBe(11200);
  });

  it("trims item names", () => {
    const result = computeTotals([{ name: "  Bread  ", quantity: 1, unitPriceCents: 100 }], 0);
    expect(result.lines[0]?.name).toBe("Bread");
  });

  it("rejects an empty line list", () => {
    expect(() => computeTotals([], 0)).toThrow(SaleValidationError);
  });

  it("rejects a blank name", () => {
    expect(() => computeTotals([{ name: "   ", quantity: 1, unitPriceCents: 100 }], 0)).toThrow(
      /item name/,
    );
  });

  it("rejects quantity below 1", () => {
    expect(() => computeTotals([{ name: "X", quantity: 0, unitPriceCents: 100 }], 0)).toThrow(
      /quantity/,
    );
  });

  it("rejects a negative unit price", () => {
    expect(() => computeTotals([{ name: "X", quantity: 1, unitPriceCents: -1 }], 0)).toThrow(
      /unit price/,
    );
  });

  it("rejects a tax rate outside 0–100%", () => {
    expect(() => computeTotals([{ name: "X", quantity: 1, unitPriceCents: 100 }], -1)).toThrow(
      /Tax rate/,
    );
    expect(() => computeTotals([{ name: "X", quantity: 1, unitPriceCents: 100 }], 10001)).toThrow(
      /Tax rate/,
    );
  });
});
