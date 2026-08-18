import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Sign in</h1>
        <p className="lede">Agents use this book instead of paper sales slips.</p>
        <LoginForm action={loginAction} nextPath={next ?? ""} />
        <p className="auth-switch">
          New agent?{" "}
          <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
