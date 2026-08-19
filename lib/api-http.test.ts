import { describe, expect, it } from "vitest";
import { ledgerParamDecision, type LedgerDecisionUser } from "./api-http";

const solo: LedgerDecisionUser = { id: "user-1", organizationId: null, organizationAdminId: null };
const member: LedgerDecisionUser = {
  id: "user-1",
  organizationId: "org-1",
  organizationAdminId: "admin-1",
};
const admin: LedgerDecisionUser = {
  id: "admin-1",
  organizationId: "org-1",
  organizationAdminId: "admin-1",
};

describe("ledgerParamDecision", () => {
  it("defaults to no opts when the param is absent", () => {
    expect(ledgerParamDecision(null, member)).toEqual({ opts: {} });
    expect(ledgerParamDecision("", solo)).toEqual({ opts: {} });
  });

  it("lets a solo account read its personal ledger", () => {
    expect(ledgerParamDecision("personal", solo)).toEqual({ opts: { activeOrgId: null } });
  });

  it("rejects ledger=org for an account without an organization", () => {
    expect(ledgerParamDecision("org", solo).error).toBe("This account has no organization.");
  });

  it("rejects ledger=personal for a non-admin member", () => {
    expect(ledgerParamDecision("personal", member).error).toBe(
      "Only the organization admin has a personal ledger.",
    );
  });

  it("lets a non-admin member read the org ledger", () => {
    expect(ledgerParamDecision("org", member)).toEqual({ opts: { activeOrgId: "org-1" } });
  });

  it("lets the org admin read either ledger", () => {
    expect(ledgerParamDecision("personal", admin)).toEqual({ opts: { activeOrgId: null } });
    expect(ledgerParamDecision("org", admin)).toEqual({ opts: { activeOrgId: "org-1" } });
  });

  it("rejects an unknown ledger value", () => {
    expect(ledgerParamDecision("team", admin).error).toBe(
      "Invalid ledger value. Use 'org' or 'personal'.",
    );
  });
});