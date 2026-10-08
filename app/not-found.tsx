import Link from "next/link";
export default function NotFound() {
  return (
    <main className="auth-page">
      <span className="brand-mark">f.</span>
      <h1>Nothing here. Yet.</h1>
      <p className="muted">
        This page may be unpublished or its address may have changed.
      </p>
      <Link className="button" href="/">
        Back to home →
      </Link>
    </main>
  );
}
