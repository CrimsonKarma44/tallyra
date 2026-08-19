import { json, options, readJson, requireApiLedgerUser, resolveLedgerScope } from "@/lib/api-http";
import { createSaleRecord, listSalesRecords, serializeSale } from "@/lib/sales-service";
import { SaleValidationError } from "@/lib/totals";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const auth = await requireApiLedgerUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  const { searchParams } = new URL(request.url);
  const scope = await resolveLedgerScope(auth.user.userId, searchParams.get("ledger"));
  if (scope.error) {
    return scope.error;
  }
  const sales = await listSalesRecords(
    auth.user.userId,
    {
      q: searchParams.get("q") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    },
    scope.opts,
  );
  return json({ sales: sales.map(serializeSale) });
}

export async function POST(request: Request) {
  const auth = await requireApiLedgerUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  try {
    const sale = await createSaleRecord(auth.user.userId, await readJson(request));
    return json({ sale: serializeSale(sale) }, 201);
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return json({ error: error.message }, 400);
    }
    return json({ error: "Could not create the sale." }, 500);
  }
}
