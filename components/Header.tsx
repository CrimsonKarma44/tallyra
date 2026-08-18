import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

export function Header({ username }: { username?: string }) {
  return (
    <header className="site-header">
      <Link className="brand" href={username ? "/" : "/login"}>
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
      ) : null}
    </header>
  );
}
