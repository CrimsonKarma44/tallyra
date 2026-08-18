import { describe, expect, it } from "vitest";
import {
  editScope,
  parseSaleWrite,
  saleQueryWhere,
  saleScope,
  serializeSale,
  type UserContext,
} from "./sales-service";

const solo: UserContext = { id: "user-123", organizationId: null, isOrgAdmin: false };
const member: UserContext = { id: "user-123", organizationId: "org-1", isOrgAdmin: false };
const admin: UserContext = { id: "user-123", organizationId: "org-1", isOrgAdmin: true };

describe("saleScope", () => {
  it("scopes a solo user to their own sales", () => {
    expect(saleScope(solo)).toEqual({ createdById: "user-123" });
  });

  it("scopes an organization member to the whole org ledger", () => {
    expect(saleScope(member)).toEqual({ createdBy: { organizationId: "org-1" } });
  });
});

describe("editScope", () => {
  it("lets a solo user edit only their own sales", () => {
    expect(editScope(solo)).toEqual({ createdById: "user-123" });
  });

  it("restricts a non-admin member to their own sales", () => {
    expect(editScope(member)).toEqual({ createdById: "user-123" });
  });

  it("lets an admin edit any sale in the org", () => {
    expect(editScope(admin)).toEqual({ createdBy: { organizationId: "org-1" } });
  });
});

describe("saleQueryWhere", () => {
  it("scopes results to the signed-in user", () => {
    const where = saleQueryWhere(solo, {});
    expect(where.createdById).toBe("user-123");
  });

  it("scopes results to the org ledger for a member", () => {
    const where = saleQueryWhere(member, {});
    expect(where.createdBy).toEqual({ organizationId: "org-1" });
  });

  it("merges search and date filters on top of the owner scope", () => {
    const where = saleQueryWhere(solo, { q: "rice", from: "2026-08-01", to: "2026-08-31" });
    expect(where.createdById).toBe("user-123");
    expect(where.soldAt).toEqual({ gte: new Date("2026-08-01T00:00:00"), lte: new Date("2026-08-31T23:59:59.999") });
    expect(where.OR).toHaveLength(5);
  });
});

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
