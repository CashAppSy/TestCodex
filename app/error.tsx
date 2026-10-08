"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <h1>Something went wrong.</h1>
      <p className="muted">
        Please try again. If this continues, check the server logs.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
