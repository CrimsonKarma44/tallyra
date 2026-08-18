import { json, options } from "@/lib/api-http";

export function OPTIONS() {
  return options();
}

export function GET() {
  return json({ ok: true, service: "ledger", version: "v1" });
}
