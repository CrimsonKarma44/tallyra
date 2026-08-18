import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ username?: string }>;
}) {
  const { username } = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Reset your password</h1>
        <p className="lede">Enter the 6-digit code from your email and a new password.</p>
        <ResetPasswordForm username={username} />
        <p className="auth-switch">
          <Link href="/forgot-password">Need a new code?</Link>
        </p>
      </div>
    </div>
  );
}