import { describe, expect, it } from "vitest";
import { extractJsonObject, modelTextToDraft, receiptModelToDraft, taxRateBpsFromModel } from "./receipt";

describe("extractJsonObject", () => {
  it("reads a raw object", () => {
    expect(extractJsonObject('{"lines":[]}')).toEqual({ lines: [] });
  });

  it("strips markdown fences", () => {
    expect(extractJsonObject('```json\n{"merchant":"A","lines":[]}\n```')).toEqual({
      merchant: "A",
      lines: [],
    });
  });
});

describe("receiptModelToDraft", () => {
  it("maps lines and merchant note", () => {
    const draft = receiptModelToDraft({
      merchant: "Aling Nena",
      taxPercent: 12,
      lines: [{ name: "Rice 5kg", quantity: 2, unitPrice: 285 }],
    });
    expect(draft.note).toBe("Scanned: Aling Nena");
    expect(draft.taxRateBps).toBe(1200);
    expect(draft.lines).toEqual([{ name: "Rice 5kg", quantity: 2, unitPriceCents: 28500 }]);
    expect(draft.receiverName).toBe("");
  });

  it("maps optional receiver fields", () => {
    const draft = receiptModelToDraft({
      lines: [{ name: "Soap", quantity: 1, unitPrice: 22 }],
      receiverName: "  Acme Corp  ",
      receiverAccount: "ACC-9",
      receiverContact: "0917 000 1111",
      receiverAddress: "Quezon City",
    });
    expect(draft.receiverName).toBe("Acme Corp");
    expect(draft.receiverAccount).toBe("ACC-9");
    expect(draft.receiverContact).toBe("0917 000 1111");
    expect(draft.receiverAddress).toBe("Quezon City");
  });

  it("derives unit price from a line total", () => {
    const draft = receiptModelToDraft({
      lines: [{ name: "Eggs", quantity: 12, lineTotal: 96 }],
    });
    expect(draft.lines[0]?.unitPriceCents).toBe(800);
  });

  it("drops blank and invalid lines", () => {
    const draft = receiptModelToDraft({
      lines: [
        { name: "  ", quantity: 1, unitPrice: 10 },
        { name: "Soap", quantity: 1, unitPrice: 22 },
        { name: "Bad", quantity: 0, unitPrice: 1 },
      ],
    });
    expect(draft.lines).toHaveLength(1);
    expect(draft.lines[0]?.name).toBe("Soap");
  });

  it("throws when nothing usable remains", () => {
    expect(() => receiptModelToDraft({ lines: [] })).toThrow(/Could not read/);
  });
});

describe("taxRateBpsFromModel", () => {
  it("uses a printed percent first", () => {
    expect(taxRateBpsFromModel(12, 999, [{ name: "X", quantity: 1, unitPriceCents: 10000 }])).toBe(
      1200,
    );
  });

  it("derives a rate from a tax amount", () => {
    expect(taxRateBpsFromModel(null, 12, [{ name: "X", quantity: 1, unitPriceCents: 10000 }])).toBe(
      1200,
    );
  });
});

describe("modelTextToDraft", () => {
  it("parses fenced model output", () => {
    const draft = modelTextToDraft(
      '```json\n{"merchant":"Store","lines":[{"name":"Water","quantity":3,"unitPrice":20}]}\n```',
    );
    expect(draft.lines[0]).toEqual({ name: "Water", quantity: 3, unitPriceCents: 2000 });
    expect(draft.note).toBe("Scanned: Store");
  });
});
