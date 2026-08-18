import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

export function Header({ username }: { username?: string }) {
  return (
    <header className="site-header">
      <Link className="brand" href={username ? "/sales" : "/"}>
        <span className="brand-mark">Ledger</span>
        <span className="brand-sub">POS transaction book</span>
      </Link>
      {username ? (
        <div className="header-user">
          <span>
            Signed in as <strong>{username}</strong>
          </span>
          <form action={logoutAction}>
            <button className="btn btn-ghost" type="submit">
              Log out
            </button>
          </form>
        </div>
      ) : (
        <div className="header-user">
          <Link className="btn btn-ghost" href="/login">
            Sign in
          </Link>
          <Link className="btn" href="/signup">
            Create account
          </Link>
        </div>
      )}
    </header>
  );
}
