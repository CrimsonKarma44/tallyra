import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/app/actions/auth";
import { LedgerSwitch } from "@/components/LedgerSwitch";

type HeaderUser = {
  username: string;
  displayName: string | null;
  avatarUpdatedAt: Date | null;
  organizationId: string | null;
  organizationName: string | null;
  ledgerContext: "personal" | "org";
  isOrgAdmin: boolean;
};

export function Header({ user }: { user?: HeaderUser | null }) {
  const avatarVersion = user?.avatarUpdatedAt?.getTime();
  const label = user?.displayName?.trim() || user?.username || "";
  const initial = label.charAt(0).toUpperCase();
  const showLedgerSwitch = Boolean(
    user?.organizationName && user.isOrgAdmin,
  );

  return (
    <header className="site-header">
      <Link className="brand" href={user ? "/sales" : "/"}>
        <svg
          className="brand-logo"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
        >
          <rect width="24" height="24" rx="6" fill="#1b8a78" />
          <g
            stroke="#f3eee4"
            strokeWidth="1.8"
            strokeLinecap="round"
            transform="translate(6 5.5)"
          >
            <line x1="0" y1="0" x2="0" y2="12" />
            <line x1="4" y1="0" x2="4" y2="12" />
            <line x1="8" y1="0" x2="8" y2="12" />
            <line x1="12" y1="0" x2="12" y2="12" />
          </g>
          <line
            x1="8.5"
            y1="15"
            x2="15.5"
            y2="9"
            stroke="#57d0bc"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="brand-mark">Tallyra</span>
      </Link>
      {user ? (
        <div className="header-user">
          {showLedgerSwitch ? (
            <LedgerSwitch
              orgName={user.organizationName!}
              activeContext={user.ledgerContext}
            />
          ) : null}
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