import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/app/actions/auth";

type HeaderUser = {
  username: string;
  displayName: string | null;
  avatarUpdatedAt: Date | null;
  organizationId: string | null;
  organizationName: string | null;
};

export function Header({ user }: { user?: HeaderUser | null }) {
  const avatarVersion = user?.avatarUpdatedAt?.getTime();
  const label = user?.displayName?.trim() || user?.username || "";
  const initial = label.charAt(0).toUpperCase();

  return (
    <header className="site-header">
      <Link className="brand" href={user ? "/sales" : "/"}>
        <span className="brand-mark">Ledger</span>
        <span className="brand-sub">POS transaction book</span>
      </Link>
      {user ? (
        <div className="header-user">
          <Link className="user-chip" href="/settings">
            {avatarVersion ? (
              <Image
                className="avatar"
                src={`/api/me/avatar?v=${avatarVersion}`}
                alt=""
                width={32}
                height={32}
                unoptimized
              />
            ) : (
              <span className="avatar avatar-fallback" aria-hidden="true">
                {initial}
              </span>
            )}
            <span>{label}</span>
          </Link>
          {user.organizationName ? (
            <Link className="org-badge" href="/org">
              {user.organizationName}
            </Link>
          ) : null}
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