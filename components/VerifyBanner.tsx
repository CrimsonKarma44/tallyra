"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function VerifyBanner() {
  const pathname = usePathname();
  if (pathname === "/verify-email") {
    return null;
  }
  return (
    <div className="verify-banner">
      <span>
        Your email isn&apos;t verified yet. Please check your inbox and confirm your account.
      </span>
      <Link href="/verify-email">Verify now</Link>
    </div>
  );
}