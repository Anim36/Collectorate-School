import Link from "next/link";

/**
 * The 404 page.
 *
 * It says nothing about what was asked for: not whether a record exists, not
 * whether the visitor was allowed to see it. A missing page and a page the
 * visitor may not read look exactly the same.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-md rounded-[16px] border border-border bg-surface p-8 text-center">
        <p className="text-caption font-semibold uppercase tracking-wide text-muted">
          404
        </p>
        <h1 className="mt-2 text-heading font-bold text-ink">
          Page not found
        </h1>
        <p className="mt-3 text-body text-muted">
          The page you asked for is not here. It may have moved, or the address
          may be wrong.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-[12px] bg-primary px-6 py-3 text-body font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to the school website
        </Link>
      </div>
    </main>
  );
}
