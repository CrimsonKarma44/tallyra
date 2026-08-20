import { json, options } from "@/lib/api-http";

export function OPTIONS() {
  return options();
}

export function GET() {
  return json({ ok: true, service: "tallyra", version: "v1" });
}
