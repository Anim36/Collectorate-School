/**
 * The money of the school.
 *
 * An amount is stored as an integer number of poisha (1 taka = 100 poisha),
 * so no amount ever goes through a float. The helpers here turn one into the
 * other and format it the way the tables show it.
 */

/** The number of poisha in one taka. */
export const POISHA_PER_TAKA = 100;

/** A taka amount as an integer number of poisha. */
export function takaToPoisha(taka: number): number {
  return Math.round(taka * POISHA_PER_TAKA);
}

/** A poisha amount as taka. */
export function poishaToTaka(poisha: number): number {
  return Math.round(poisha / POISHA_PER_TAKA);
}

/** Formats a taka amount the way the tables show it, e.g. "৳ 1,500". */
export function formatTaka(taka: number): string {
  return `৳ ${Math.round(taka).toLocaleString("en-US")}`;
}

/** Formats a poisha amount the way the tables show it, e.g. "৳ 1,500". */
export function formatPoisha(poisha: number): string {
  return formatTaka(poishaToTaka(poisha));
}

/**
 * A short taka amount, e.g. "৳ 875K" or "৳ 1M".
 *
 * The metric cards of the dashboard hold the whole collection of the school,
 * so the figure is shortened to keep the card one line.
 */
export function formatTakaCompact(taka: number): string {
  const amount = Math.round(taka);

  if (Math.abs(amount) >= 1_000_000) {
    return `৳ ${Math.round(amount / 1_000_000)}M`;
  }

  if (Math.abs(amount) >= 1000) {
    return `৳ ${Math.round(amount / 1000)}K`;
  }

  return formatTaka(amount);
}

/**
 * A short poisha amount, e.g. "৳ 875K" or "৳ 1M".
 *
 * The metric cards hold the whole collection of the school, so the figure is
 * shortened to keep the card one line on every screen.
 */
export function formatPoishaCompact(poisha: number): string {
  return formatTakaCompact(poishaToTaka(poisha));
}
