import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Forgot your password?</h1>
        <p className="lede">
          Enter your username or email and we&apos;ll send a one-time reset code. Only accounts
          with a verified email can recover their password.
        </p>
        <ForgotPasswordForm />
        <p className="auth-switch">
          Remembered it? <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}