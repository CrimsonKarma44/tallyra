import { describe, expect, it } from "vitest";
import { ExpenseValidationError, parseExpenseWrite } from "./expenses";

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