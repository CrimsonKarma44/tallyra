"use client";

import { useState } from "react";
import { createSale } from "@/app/actions/sales";
import { SaleForm, type InitialSale } from "@/components/SaleForm";
import { ScanOverlay } from "@/components/ScanOverlay";
import type { ScannedSaleDraft } from "@/lib/scan-receipt";

function fromScan(draft: ScannedSaleDraft): InitialSale {
  return {
    soldAt: new Date(draft.soldAtIso),
    note: draft.note,
    taxRateBps: Math.round(Number(draft.taxRate) * 100) || 0,
    receiverName: draft.receiverName,
    receiverAccount: draft.receiverAccount,
    receiverContact: draft.receiverContact,
    receiverAddress: draft.receiverAddress,
    lines: draft.lines,
  };
}

export function ScanSaleEntry() {
  const [initial, setInitial] = useState<InitialSale | null>(null);

  if (!initial) {
    return <ScanOverlay onScanned={(draft) => setInitial(fromScan(draft))} />;
  }

  return (
    <main className="main">
      <div className="sale-card">
        <h1>Review scanned sale</h1>
        <p className="lede">Check the lines and receiver, then save. Totals update as you edit.</p>
        <SaleForm action={createSale} submitLabel="Save sale" initial={initial} />
      </div>
    </main>
  );
}
