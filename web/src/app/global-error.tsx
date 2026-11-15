"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#05060a", color: "#d7e7ea", fontFamily: "ui-monospace, monospace" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
          <div>
            <p>The page failed to render.</p>
            <button type="button" onClick={reset} style={{ marginTop: "1rem" }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
