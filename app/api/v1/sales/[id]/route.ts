import { json, options, readJson, requireApiUser } from "@/lib/api-http";
import { deleteSaleRecord, getSaleRecord, serializeSale, updateSaleRecord } from "@/lib/sales-service";
import { SaleValidationError } from "@/lib/totals";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  const { id } = await params;
  const sale = await getSaleRecord(id, auth.user.userId);
  if (!sale) {
    return json({ error: "Sale not found." }, 404);
  }
  return json({ sale: serializeSale(sale) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  const { id } = await params;
  try {
    const sale = await updateSaleRecord(id, auth.user.userId, await readJson(request));
    if (!sale) {
      return json({ error: "Sale not found." }, 404);
    }
    return json({ sale: serializeSale(sale) });
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return json({ error: error.message }, 400);
    }
    return json({ error: "Could not update the sale." }, 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  const { id } = await params;
  const deleted = await deleteSaleRecord(id, auth.user.userId);
  if (!deleted) {
    return json({ error: "Sale not found." }, 404);
  }
  return json({ ok: true });
}
