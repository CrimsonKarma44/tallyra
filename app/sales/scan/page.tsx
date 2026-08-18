import { ScanSaleEntry } from "@/components/ScanSaleEntry";
import { requireUser } from "@/lib/session";

export default async function ScanSalePage() {
  await requireUser();
  return <ScanSaleEntry />;
}
