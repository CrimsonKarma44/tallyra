"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { SaleActionState } from "@/app/actions/sales";
import { centsToInput, formatCents, toDateTimeLocal } from "@/lib/money";
import { computeTotals } from "@/lib/totals";

type LineDraft = {
  key: string;
  name: string;
  quantity: string;
  unitPrice: string;
};

export type InitialSale = {
  id?: string;
  soldAt: Date;
  note: string;
  taxRateBps: number;
  receiverName?: string | null;
  receiverAccount?: string | null;
  receiverContact?: string | null;
  receiverAddress?: string | null;
  lines: Array<{ name: string; quantity: number; unitPriceCents: number }>;
};

type Props = {
  action: (state: SaleActionState, formData: FormData) => Promise<SaleActionState>;
  initial: InitialSale;
  submitLabel: string;
};

function newKey() {
  return Math.random().toString(36).slice(2);
}

function emptyLine(): LineDraft {
  return { key: newKey(), name: "", quantity: "1", unitPrice: "0.00" };
}

export function SaleForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [soldAt, setSoldAt] = useState(toDateTimeLocal(initial.soldAt));
  const [note, setNote] = useState(initial.note);
  const [taxRate, setTaxRate] = useState((initial.taxRateBps / 100).toString());
  const [receiverName, setReceiverName] = useState(initial.receiverName ?? "");
  const [receiverAccount, setReceiverAccount] = useState(initial.receiverAccount ?? "");
  const [receiverContact, setReceiverContact] = useState(initial.receiverContact ?? "");
  const [receiverAddress, setReceiverAddress] = useState(initial.receiverAddress ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    initial.lines.length
      ? initial.lines.map((line) => ({
          key: newKey(),
          name: line.name,
          quantity: String(line.quantity),
          unitPrice: centsToInput(line.unitPriceCents),
        }))
      : [emptyLine()],
  );

  const preview = useMemo(() => {
    try {
      const parsed = lines.map((line) => ({
        name: line.name,
        quantity: Number.parseInt(line.quantity, 10),
        unitPriceCents: Math.round(Number(line.unitPrice) * 100),
      }));
      const bps = Math.round(Number(taxRate) * 100);
      return { ok: true as const, totals: computeTotals(parsed, Number.isFinite(bps) ? bps : 0) };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Check the line items.",
      };
    }
  }, [lines, taxRate]);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  return (
    <form action={formAction}>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(
          lines.map(({ name, quantity, unitPrice }) => ({
            name,
            quantity: Number.parseInt(quantity, 10),
            unitPrice,
          })),
        )}
      />
      {state?.error ? <p className="error">{state.error}</p> : null}

      <p>
        <label>
          Sold at
          <input
            type="datetime-local"
            name="soldAt"
            value={soldAt}
            onChange={(event) => setSoldAt(event.target.value)}
            required
          />
        </label>
      </p>
      <p>
        <label>
          Tax rate (%)
          <input
            name="taxRate"
            inputMode="decimal"
            value={taxRate}
            onChange={(event) => setTaxRate(event.target.value)}
          />
        </label>
      </p>
      <p>
        <label>
          Note
          <textarea name="note" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </p>

      <h2>Receiver <span className="muted">(optional)</span></h2>
      <div className="receiver-grid">
        <label>
          Name / company
          <input
            name="receiverName"
            value={receiverName}
            onChange={(event) => setReceiverName(event.target.value)}
          />
        </label>
        <label>
          Account number
          <input
            name="receiverAccount"
            value={receiverAccount}
            onChange={(event) => setReceiverAccount(event.target.value)}
          />
        </label>
        <label>
          Phone or email
          <input
            name="receiverContact"
            value={receiverContact}
            onChange={(event) => setReceiverContact(event.target.value)}
          />
        </label>
        <label>
          Address
          <input
            name="receiverAddress"
            value={receiverAddress}
            onChange={(event) => setReceiverAddress(event.target.value)}
          />
        </label>
      </div>

      <h2>Line items</h2>
      <div className="lines">
        {lines.map((line, index) => (
          <div className="line-grid" key={line.key}>
            <label>
              {index === 0 ? "Item" : <span className="muted">Item</span>}
              <input
                value={line.name}
                onChange={(event) => updateLine(line.key, { name: event.target.value })}
                required
              />
            </label>
            <label>
              {index === 0 ? "Qty" : <span className="muted">Qty</span>}
              <input
                inputMode="numeric"
                value={line.quantity}
                onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                required
              />
            </label>
            <label>
              {index === 0 ? "Unit price" : <span className="muted">Unit price</span>}
              <input
                inputMode="decimal"
                value={line.unitPrice}
                onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                required
              />
            </label>
            <label>
              {index === 0 ? "Line total" : <span className="muted">Line total</span>}
              <input
                readOnly
                value={
                  preview.ok
                    ? formatCents(preview.totals.lines[index]?.lineTotalCents ?? 0)
                    : "—"
                }
              />
            </label>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={lines.length === 1}
              onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" type="button" onClick={() => setLines((current) => [...current, emptyLine()])}>
        Add line
      </button>

      <div className="totals-panel">
        {preview.ok ? (
          <>
            <div className="totals-row">
              <span>Subtotal</span>
              <span className="money">{formatCents(preview.totals.subtotalCents)}</span>
            </div>
            <div className="totals-row">
              <span>Tax</span>
              <span className="money">{formatCents(preview.totals.taxCents)}</span>
            </div>
            <div className="totals-row grand">
              <strong>Total</strong>
              <strong className="money">{formatCents(preview.totals.totalCents)}</strong>
            </div>
          </>
        ) : (
          <p className="muted">{preview.message}</p>
        )}
      </div>

      <div className="btn-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link className="btn btn-secondary" href="/">
          Cancel
        </Link>
      </div>
    </form>
  );
}
