/**
 * The hard limits every list read respects.
 *
 * The form schemas already cap the page size a caller may ask for. These are
 * the second line: a service that builds its own query uses the same ceiling,
 * so a new page cannot accidentally read an unbounded table.
 */

/** The most rows one page may hold. */
export const MAX_PAGE_SIZE = 100;

/** The longest search term the database is asked to match. */
export const MAX_SEARCH_LENGTH = 120;

/**
 * The most rows a list that is not paginated may read.
 *
 * It is deliberately larger than a school list: the cap is a guard against a
 * table that grew by mistake, not a page size.
 */
export const MAX_LIST_ROWS = 500;

/** Clamps a page size to the allowed range. */
export function clampPageSize(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

/** Clamps a search term to the allowed length. */
export function clampSearch(value: string | undefined): string {
  return (value ?? "").slice(0, MAX_SEARCH_LENGTH);
}
