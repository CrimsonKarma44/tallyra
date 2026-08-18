import Link from "next/link";
import { signupAction } from "@/app/actions/auth";
import { SignupForm } from "@/components/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Create an account</h1>
        <p className="lede">Register as an agent to start recording sales.</p>
        <SignupForm action={signupAction} nextPath={next ?? ""} />
        <p className="auth-switch">
          Already have an account? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
