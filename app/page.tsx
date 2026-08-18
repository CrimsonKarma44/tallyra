import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="landing">
      <section className="landing-hero">
        <p className="landing-kicker">POS transaction book</p>
        <h1>Replace the paper sales book.</h1>
        <p className="lede">
          Ledger is a small web app for recording point-of-sale transactions — line items, automatic
          totals, optional receivers, and a REST API so other services can keep the same books.
        </p>
        <div className="btn-row">
          <Link className="btn" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-secondary" href="/signup">
            Create an account
          </Link>
        </div>
      </section>

      <section className="landing-features">
        <article className="card landing-card">
          <h2>Record sales</h2>
          <p className="muted">
            Add items, quantities, and prices. Subtotal, tax, and total are computed for you and
            stored with the sale.
          </p>
        </article>
        <article className="card landing-card">
          <h2>Scan a receipt</h2>
          <p className="muted">
            Photograph a paper slip, review the extracted lines, then save. You stay in control of
            what goes in the book.
          </p>
        </article>
        <article className="card landing-card">
          <h2>Ledger API</h2>
          <p className="muted">
            Other services can log in and create, list, update, or delete sales through{" "}
            <code>/api/v1</code>.
          </p>
        </article>
      </section>
    </main>
  );
}
