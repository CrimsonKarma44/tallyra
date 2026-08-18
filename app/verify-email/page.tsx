import Link from "next/link";
import { requireUser } from "@/lib/session";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage() {
  await requireUser();
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Check your email</h1>
        <p className="lede">
          We sent a 6-digit code to your inbox. Enter it below to verify your account.
        </p>
        <VerifyEmailForm />
        <p className="auth-switch">
          Already verified? <Link href="/sales">Go to the dashboard</Link>
        </p>
      </div>
    </div>
  );
}