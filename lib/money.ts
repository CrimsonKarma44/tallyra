const DEFAULT_CURRENCY = "NGN";

export function getCurrency(): string {
  return process.env.APP_CURRENCY?.trim() || DEFAULT_CURRENCY;
}

function localeFor(currency: string): string {
  return currency === "NGN" ? "en-NG" : "en-PH";
}

/** Convert a decimal currency string ("25.50") to integer cents. */
export function pesosToCents(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Price is required.");
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Price must be a number of 0 or more.");
  }
  return Math.round(value * 100);
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatCents(cents: number, currency = getCurrency()): string {
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatSoldAt(date: Date): string {
  return new Intl.DateTimeFormat(localeFor(getCurrency()), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
