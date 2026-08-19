import Link from "next/link";

const featureCards = [
  {
    title: "Record sales",
    body: "Add items, quantities, and prices. Subtotal, tax, and total are computed for you and stored with the sale.",
    icon: "₱",
  },
  {
    title: "Scan a receipt",
    body: "Photograph a paper slip, review the extracted lines, then save. You stay in control of what goes in the book.",
    icon: "◈",
  },
  {
    title: "Track expenses",
    body: "Record money going out on /expenses. Outgoing totals flow straight into the dashboard alongside revenue.",
    icon: "↘",
  },
  {
    title: "Organizations",
    body: "One shared ledger for the whole team. The admin adds member accounts and every entry is attributed.",
    icon: "◎",
  },
  {
    title: "Personal or org",
    body: "Admins keep a personal book separate from the org and migrate entries between the two, all or selected.",
    icon: "⇄",
  },
  {
    title: "Ledger API",
    body: "Other services can log in and create, list, update, or delete sales through /api/v1.",
    icon: "⌘",
  },
];

const steps = [
  {
    title: "Create an account",
    body: "Sign up as a personal agent or start an organization. No cards, no setup — just a username and password.",
  },
  {
    title: "Record sales & expenses",
    body: "Type the sale, scan a receipt, or log expenses. Totals are computed and stored in cents, every time.",
  },
  {
    title: "Review your books",
    body: "See revenue vs. expenses, best sellers, and a per-agent breakdown — filtered by date, exported anytime.",
  },
];

const previewRows = [
  { id: "POS #1042", item: "Rice 5kg", total: "1,282.80" },
  { id: "POS #1041", item: "Cooking oil 1L", total: "641.40" },
  { id: "POS #1040", item: "Instant coffee 3-in-1", total: "1,140.00" },
  { id: "POS #1039", item: "Bath soap bar", total: "285.60" },
];

export default function LandingPage() {
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">POS transaction book</p>
          <h1>Replace the paper sales book.</h1>
          <p className="lede">
            Ledger is a small web app for recording point-of-sale transactions — line items,
            automatic totals, optional receivers, and a REST API so other services can keep the same
            books.
          </p>
          <div className="btn-row">
            <Link className="btn" href="/login">
              Sign in
            </Link>
            <Link className="btn btn-secondary" href="/signup">
              Create an account
            </Link>
          </div>
          <ul className="landing-chips" aria-label="Highlights">
            <li>Automatic totals</li>
            <li>Receipt scan</li>
            <li>Expenses</li>
            <li>REST API</li>
          </ul>
        </div>

        <div className="landing-preview" aria-hidden="true">
          <div className="landing-preview-head">
            <span className="landing-preview-brand">
              <span className="landing-preview-dot" /> Ledger
            </span>
            <span className="landing-preview-date">Today</span>
          </div>
          <div className="landing-preview-table" role="presentation">
            <div className="landing-preview-row landing-preview-row-head">
              <span>Reference</span>
              <span>Item</span>
              <span>Total</span>
            </div>
            {previewRows.map((row) => (
              <div className="landing-preview-row" key={row.id}>
                <span className="mono">{row.id}</span>
                <span>{row.item}</span>
                <span className="mono">₱ {row.total}</span>
              </div>
            ))}
          </div>
          <div className="landing-preview-foot">
            <span className="landing-preview-badge">Auto-computed totals</span>
            <span className="landing-preview-sum">
              Today <strong className="mono">₱ 3,349.80</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="landing-features">
        {featureCards.map((card) => (
          <article className="card landing-card" key={card.title}>
            <span className="landing-card-icon" aria-hidden="true">
              {card.icon}
            </span>
            <h2>{card.title}</h2>
            <p className="muted">{card.body}</p>
          </article>
        ))}
      </section>

      <section className="landing-steps">
        <div className="landing-steps-head">
          <p className="landing-kicker">How it works</p>
          <h2>From paper book to dashboard in minutes</h2>
        </div>
        <ol className="landing-steps-list">
          {steps.map((step, i) => (
            <li className="card landing-step" key={step.title}>
              <span className="landing-step-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p className="muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-cta">
        <h2>Ready to retire the paper book?</h2>
        <p>Start recording today — totals, expenses, and the whole ledger in one place.</p>
        <div className="btn-row landing-cta-btns">
          <Link className="btn" href="/signup">
            Create an account
          </Link>
          <Link className="btn btn-light" href="/login">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}