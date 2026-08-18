import { z } from "zod";
import { computeTotals, SaleValidationError, type LineInput } from "@/lib/totals";

export const RECEIPT_PROMPT = `Read this photo of a store receipt and extract the purchased items.

Return JSON only, no markdown, in this exact shape:
{
  "merchant": "store name or null",
  "soldAt": "ISO-8601 datetime if printed, else null",
  "taxPercent": 0,
  "taxAmount": 0,
  "currency": "PHP",
  "receiverName": "buyer or company name or null",
  "receiverAccount": "account or reference number or null",
  "receiverContact": "phone or email or null",
  "receiverAddress": "address or null",
  "lines": [{ "name": "item name", "quantity": 1, "unitPrice": 10.5, "lineTotal": 10.5 }]
}

Rules:
- Include only purchased items. Skip subtotal, tax, total, cash, change, address, and payment lines.
- quantity must be a whole number >= 1. If missing, use 1.
- unitPrice is the per-unit price. If only a line total is printed, set unitPrice = lineTotal / quantity.
- taxPercent is the VAT or tax rate as a number (12 means 12%). If only a tax money amount is printed, put it in taxAmount and set taxPercent to null.
- Receiver fields are optional. Use the customer/buyer if printed; otherwise null. Do not invent them.
- If this is not a receipt, return {"lines":[]}.`;

const modelLineSchema = z.object({
  name: z.string(),
  quantity: z.number().optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  lineTotal: z.number().optional().nullable(),
});

export const receiptModelSchema = z.object({
  merchant: z.string().nullable().optional(),
  soldAt: z.string().nullable().optional(),
  taxPercent: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  receiverName: z.string().nullable().optional(),
  receiverAccount: z.string().nullable().optional(),
  receiverContact: z.string().nullable().optional(),
  receiverAddress: z.string().nullable().optional(),
  lines: z.array(modelLineSchema).default([]),
});

export type ReceiptDraftLine = {
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export type ReceiverDraft = {
  receiverName: string;
  receiverAccount: string;
  receiverContact: string;
  receiverAddress: string;
};

export type ReceiptDraft = {
  soldAt: Date | null;
  taxRateBps: number;
  note: string;
  lines: ReceiptDraftLine[];
} & ReceiverDraft;

function optionalText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The scanner did not return usable data.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function toQuantity(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return 1;
  }
  const qty = Math.round(value);
  return qty >= 1 ? qty : null;
}

function toUnitPriceCents(
  unitPrice: number | null | undefined,
  lineTotal: number | null | undefined,
  quantity: number,
): number | null {
  if (unitPrice != null && Number.isFinite(unitPrice) && unitPrice >= 0) {
    return Math.round(unitPrice * 100);
  }
  if (lineTotal != null && Number.isFinite(lineTotal) && lineTotal >= 0 && quantity > 0) {
    return Math.round((lineTotal / quantity) * 100);
  }
  return null;
}

export function parseSoldAt(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) {
    return null;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function taxRateBpsFromModel(
  taxPercent: number | null | undefined,
  taxAmount: number | null | undefined,
  lines: LineInput[],
): number {
  if (taxPercent != null && Number.isFinite(taxPercent) && taxPercent >= 0 && taxPercent <= 100) {
    return Math.round(taxPercent * 100);
  }
  if (taxAmount != null && Number.isFinite(taxAmount) && taxAmount >= 0 && lines.length > 0) {
    try {
      const { subtotalCents } = computeTotals(lines, 0);
      if (subtotalCents > 0) {
        const taxCents = Math.round(taxAmount * 100);
        const bps = Math.round((taxCents / subtotalCents) * 10000);
        if (bps >= 0 && bps <= 10000) {
          return bps;
        }
      }
    } catch {
      return 0;
    }
  }
  return 0;
}

export function receiptModelToDraft(input: unknown): ReceiptDraft {
  const parsed = receiptModelSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Could not read any items from that photo.");
  }

  const lines: ReceiptDraftLine[] = [];
  for (const line of parsed.data.lines) {
    const name = line.name.trim();
    const quantity = toQuantity(line.quantity);
    if (!name || quantity == null) {
      continue;
    }
    const unitPriceCents = toUnitPriceCents(line.unitPrice, line.lineTotal, quantity);
    if (unitPriceCents == null) {
      continue;
    }
    lines.push({ name, quantity, unitPriceCents });
  }

  if (lines.length === 0) {
    throw new Error("Could not read any items from that photo.");
  }

  const asInputs: LineInput[] = lines.map(({ name, quantity, unitPriceCents }) => ({
    name,
    quantity,
    unitPriceCents,
  }));

  try {
    computeTotals(asInputs, 0);
  } catch (error) {
    if (error instanceof SaleValidationError) {
      throw new Error(error.message);
    }
    throw error;
  }

  const merchant = parsed.data.merchant?.trim();
  return {
    soldAt: parseSoldAt(parsed.data.soldAt),
    taxRateBps: taxRateBpsFromModel(parsed.data.taxPercent, parsed.data.taxAmount, asInputs),
    note: merchant ? `Scanned: ${merchant}` : "Scanned receipt",
    receiverName: optionalText(parsed.data.receiverName),
    receiverAccount: optionalText(parsed.data.receiverAccount),
    receiverContact: optionalText(parsed.data.receiverContact),
    receiverAddress: optionalText(parsed.data.receiverAddress),
    lines,
  };
}

export function modelTextToDraft(raw: string): ReceiptDraft {
  return receiptModelToDraft(extractJsonObject(raw));
}
