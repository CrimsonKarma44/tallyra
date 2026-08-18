"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { ScannedSaleDraft } from "@/lib/scan-receipt";

type Props = {
  onScanned: (draft: ScannedSaleDraft) => void;
};

export function ScanOverlay({ onScanned }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/receipt/scan", { method: "POST", body: data });
      const result = (await response.json()) as { error?: string; draft?: ScannedSaleDraft };
      if (!response.ok || result.error || !result.draft) {
        setError(result.error ?? "Could not read that receipt.");
        return;
      }
      onScanned(result.draft);
    } catch {
      setError("Could not reach the scanner. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="scan-overlay" role="dialog" aria-modal="true" aria-labelledby="scan-title">
      <div className="scan-dialog">
        <h1 id="scan-title">Scan receipt</h1>
        <p className="lede">Choose a JPEG or PNG of the paper slip. We will fill the sale for you to review.</p>
        <form onSubmit={handleSubmit}>
          {error ? <p className="error">{error}</p> : null}
          <label>
            Receipt photo
            <input
              type="file"
              name="receipt"
              accept="image/jpeg,image/png"
              capture="environment"
              required
              disabled={pending}
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
          </label>
          {fileName ? <p className="muted">{fileName}</p> : null}
          <div className="btn-row">
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Reading…" : "Read receipt"}
            </button>
            <Link className="btn btn-secondary" href="/">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
