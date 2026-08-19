import { describe, expect, it } from "vitest";
import { ExpenseValidationError, expenseListWhere, parseExpenseWrite, serializeExpense } from "./expenses";

describe("parseExpenseWrite", () => {
  it("parses an amount in pesos to cents", () => {
    expect(parseExpenseWrite({ amount: "25.50" })).toMatchObject({ amountCents: 2550 });
  });

  it("accepts a whole-number amount", () => {
    expect(parseExpenseWrite({ amount: 100 })).toMatchObject({ amountCents: 10000 });
  });

  it("rejects a missing amount", () => {
    expect(() => parseExpenseWrite({ amount: "" })).toThrow(ExpenseValidationError);
  });

  it("rejects a zero or negative amount", () => {
    expect(() => parseExpenseWrite({ amount: "0" })).toThrow(/greater than zero/);
    expect(() => parseExpenseWrite({ amount: "-5" })).toThrow(/greater than zero/);
  });

  it("rejects an invalid amount", () => {
    expect(() => parseExpenseWrite({ amount: "abc" })).toThrow(ExpenseValidationError);
  });

  it("rejects an invalid date", () => {
    expect(() => parseExpenseWrite({ amount: "10", spentAt: "not-a-date" })).toThrow(/date is invalid/);
  });

  it("trims the note and enforces a length limit", () => {
    expect(parseExpenseWrite({ amount: "10", note: "  restock  " })).toMatchObject({ note: "restock" });
    expect(() => parseExpenseWrite({ amount: "10", note: "x".repeat(201) })).toThrow(/200 characters/);
  });

  it("defaults the date to now when omitted", () => {
    const before = Date.now();
    const parsed = parseExpenseWrite({ amount: "10" });
    expect(parsed.spentAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("serializeExpense", () => {
  it("converts cents to currency units and keeps ISO dates", () => {
    const expense = {
      id: "exp-1",
      createdAt: new Date("2026-08-18T00:00:00Z"),
      updatedAt: new Date("2026-08-18T00:00:00Z"),
      spentAt: new Date("2026-08-17T12:30:00Z"),
      amountCents: 12345,
      note: "restock",
      createdBy: { id: "user-1", username: "agent" },
    };
    expect(serializeExpense(expense)).toEqual({
      id: "exp-1",
      spentAt: "2026-08-17T12:30:00.000Z",
      createdAt: "2026-08-18T00:00:00.000Z",
      updatedAt: "2026-08-18T00:00:00.000Z",
      amount: 123.45,
      currency: expect.any(String),
      note: "restock",
      createdBy: { id: "user-1", username: "agent" },
    });
  });
});

describe("expenseListWhere", () => {
  const solo = { id: "user-1", organizationId: null, activeOrgId: null, isOrgAdmin: false };

  it("scopes a solo user to their own personal ledger", () => {
    expect(expenseListWhere(solo, {})).toEqual({ createdById: "user-1", ledgerOrgId: null });
  });

  it("adds a date filter when given", () => {
    expect(expenseListWhere(solo, { from: "2026-08-01", to: "2026-08-31" })).toMatchObject({
      spentAt: { gte: new Date("2026-08-01T00:00:00"), lte: new Date("2026-08-31T23:59:59.999") },
    });
  });
});