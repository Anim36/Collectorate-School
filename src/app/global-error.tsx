"use client";

/**
 * The error page for a failure that takes the root layout down.
 *
 * It has to carry its own html and body. Like the ordinary error page, it
 * shows a reference and never the message, the stack or a database message.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              We could not load the site
            </h1>
            <p style={{ marginTop: "0.75rem", color: "#555" }}>
              Please try again. If it keeps happening, contact the school
              office and give them the reference below.
            </p>
            {error.digest ? (
              <p style={{ marginTop: "0.5rem", color: "#555" }}>
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
