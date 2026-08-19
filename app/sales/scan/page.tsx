import { ScanSaleEntry } from "@/components/ScanSaleEntry";
import { requireVerifiedUser } from "@/lib/session";

export default async function ScanSalePage() {
  await requireVerifiedUser();
  return <ScanSaleEntry />;
}
