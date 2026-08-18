import { describe, expect, it } from "vitest";
import { parseSaleWrite, serializeSale } from "./sales-service";

describe("parseSaleWrite", () => {
  it("computes totals from decimal unit prices", () => {
    const parsed = parseSaleWrite({
      taxRate: 12,
      lines: [{ name: "Rice", quantity: 2, unitPrice: 285 }],
    });
    expect(parsed.totals.subtotalCents).toBe(57000);
    expect(parsed.totals.taxCents).toBe(6840);
    expect(parsed.totals.totalCents).toBe(63840);
  });

  it("rejects an empty line list", () => {
    expect(() => parseSaleWrite({ lines: [] })).toThrow(/invalid/i);
  });
});

describe("serializeSale", () => {
  it("exposes money as currency units, not cents", () => {
    const json = serializeSale({
      id: "s1",
      createdAt: new Date("2026-08-18T00:00:00Z"),
      updatedAt: new Date("2026-08-18T00:00:00Z"),
      soldAt: new Date("2026-08-18T00:00:00Z"),
      note: "",
      taxRateBps: 1200,
      subtotalCents: 10000,
      taxCents: 1200,
      totalCents: 11200,
      receiverName: "Acme",
      receiverAccount: null,
      receiverContact: null,
      receiverAddress: null,
      createdBy: { id: "u1", username: "agent" },
      lines: [
        { id: "l1", name: "Item", quantity: 1, unitPriceCents: 10000, lineTotalCents: 10000 },
      ],
    });
    expect(json.taxRate).toBe(12);
    expect(json.total).toBe(112);
    expect(json.lines[0]?.unitPrice).toBe(100);
    expect(json.receiver.name).toBe("Acme");
  });
});
