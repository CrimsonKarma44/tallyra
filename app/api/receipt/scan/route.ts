import { NextResponse } from "next/server";
import { scanReceiptImage } from "@/lib/scan-receipt";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Sign in to scan a receipt." }, { status: 401 });
  }

  const formData = await request.formData();
  const result = await scanReceiptImage(formData);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
