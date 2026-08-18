export type LineInput = {
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export type ComputedLine = LineInput & {
  lineTotalCents: number;
};

export type SaleTotals = {
  lines: ComputedLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export class SaleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaleValidationError";
  }
}

export function computeLineTotalCents(quantity: number, unitPriceCents: number): number {
  return quantity * unitPriceCents;
}

export function computeTotals(lines: LineInput[], taxRateBps: number): SaleTotals {
  if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000) {
    throw new SaleValidationError("Tax rate must be between 0% and 100%.");
  }
  if (lines.length === 0) {
    throw new SaleValidationError("Add at least one line item.");
  }

  const computed: ComputedLine[] = lines.map((line, index) => {
    const name = line.name.trim();
    if (!name) {
      throw new SaleValidationError(`Line ${index + 1} needs an item name.`);
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new SaleValidationError(`Line ${index + 1} quantity must be a whole number of 1 or more.`);
    }
    if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
      throw new SaleValidationError(`Line ${index + 1} unit price must be 0 or more.`);
    }
    return {
      name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      lineTotalCents: computeLineTotalCents(line.quantity, line.unitPriceCents),
    };
  });

  const subtotalCents = computed.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10000);
  const totalCents = subtotalCents + taxCents;

  return { lines: computed, subtotalCents, taxCents, totalCents };
}
