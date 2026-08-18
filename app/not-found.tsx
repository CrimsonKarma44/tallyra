import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main">
      <div className="card empty">
        <h1>Not found</h1>
        <p>That sale is not in the book.</p>
        <Link className="btn" href="/sales">
          Back to sales
        </Link>
      </div>
    </main>
  );
}
