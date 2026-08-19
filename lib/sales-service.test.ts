import { describe, expect, it } from "vitest";
import {
  editScope,
  parseSaleWrite,
  saleQueryWhere,
  saleScope,
  serializeSale,
  type UserContext,
} from "./sales-service";

const solo: UserContext = { id: "user-123", organizationId: null, activeOrgId: null, isOrgAdmin: false };
const member: UserContext = {
  id: "user-123",
  organizationId: "org-1",
  activeOrgId: "org-1",
  isOrgAdmin: false,
};
const admin: UserContext = {
  id: "user-123",
  organizationId: "org-1",
  activeOrgId: "org-1",
  isOrgAdmin: true,
};
const memberPersonal: UserContext = {
  id: "user-123",
  organizationId: "org-1",
  activeOrgId: null,
  isOrgAdmin: false,
};

describe("saleScope", () => {
  it("scopes a solo user to their own personal ledger", () => {
    expect(saleScope(solo)).toEqual({ createdById: "user-123", ledgerOrgId: null });
  });

  it("scopes a member in personal context to their own personal ledger", () => {
    expect(saleScope(memberPersonal)).toEqual({ createdById: "user-123", ledgerOrgId: null });
  });

  it("scopes a non-admin member to only their own org entries", () => {
    expect(saleScope(member)).toEqual({ ledgerOrgId: "org-1", createdById: "user-123" });
  });

  it("scopes an admin to the whole org ledger", () => {
    expect(saleScope(admin)).toEqual({ ledgerOrgId: "org-1" });
  });
});

describe("editScope", () => {
  it("lets a solo user edit only their own sales", () => {
    expect(editScope(solo)).toEqual({ createdById: "user-123", ledgerOrgId: null });
  });

  it("restricts a non-admin member to their own org sales", () => {
    expect(editScope(member)).toEqual({ ledgerOrgId: "org-1", createdById: "user-123" });
  });

  it("lets an admin edit any sale in the org", () => {
    expect(editScope(admin)).toEqual({ ledgerOrgId: "org-1" });
  });
});

describe("saleQueryWhere", () => {
  it("scopes results to the signed-in user's personal ledger", () => {
    const where = saleQueryWhere(solo, {});
    expect(where.createdById).toBe("user-123");
    expect(where.ledgerOrgId).toBeNull();
  });

  it("scopes a member to their own org entries", () => {
    const where = saleQueryWhere(member, {});
    expect(where.ledgerOrgId).toBe("org-1");
    expect(where.createdById).toBe("user-123");
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
