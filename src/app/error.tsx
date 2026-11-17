"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The error page.
 *
 * The error object is logged by Next.js on the server, with the stack trace.
 * Nothing from it is put on the page: the visitor gets a plain sentence and a
 * way back, so a database message or a file path never reaches a browser.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only part that is safe to show in a support request.
    // The message and the stack are never copied into the DOM.
    console.error("Page error", error.digest ?? "no digest");
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-md rounded-[16px] border border-border bg-surface p-8 text-center">
        <p className="text-caption font-semibold uppercase tracking-wide text-muted">
          Something went wrong
        </p>
        <h1 className="mt-2 text-heading font-bold text-ink">
          We could not load this page
        </h1>
        <p className="mt-3 text-body text-muted">
          Please try again. If it keeps happening, contact the school office
          and give them the reference below.
        </p>
        {error.digest ? (
          <p className="mt-2 text-caption text-muted">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-[12px] bg-primary px-6 py-3 text-body font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-[12px] border border-border px-6 py-3 text-body font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
