/**
 * Small helpers shared by the seed.
 */

/**
 * Reads a required environment variable.
 *
 * The seed refuses to run without its secrets rather than falling back to a
 * hardcoded password.
 */
export function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill it in.`,
    );
  }

  return value;
}

/** A slug of a name, used to build readable ids. */
export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * The normalised copy of a login id.
 *
 * It is lower cased and trimmed, so "Admin" and "admin" are the same
 * account.
 */
export function normalizeLoginId(value: string): string {
  return value.trim().toLowerCase();
}

/** A taka amount in poisha. 1 taka = 100 poisha. */
export function poisha(taka: number): number {
  return taka * 100;
}

/** A date from an ISO `yyyy-mm-dd` string, at midnight UTC. */
export function isoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** A date and time from an ISO `yyyy-mm-ddThh:mm` string, at UTC. */
export function isoDateTime(value: string): Date {
  return new Date(`${value}:00.000Z`);
}

/** A date and time from an ISO `yyyy-mm-ddThh:mm:ss` string, at UTC. */
export function isoDateTimeSeconds(value: string): Date {
  return new Date(`${value}.000Z`);
}

/**
 * The number of rows written in one batch.
 *
 * The seed writes tens of thousands of rows, so they go in chunks rather
 * than one round trip at a time.
 */
export const SEED_BATCH_SIZE = 500;

/**
 * Writes rows with an upsert, a batch at a time.
 *
 * The rows are split into chunks and each chunk is written inside one
 * transaction, so the seed makes a handful of round trips instead of one per
 * row, and a failure leaves the rows before it written and the rest
 * untouched.
 */
export async function upsertInChunks<T>(
  prisma: {
    $transaction(operations: readonly Promise<unknown>[]): Promise<unknown>;
  },
  delegate: {
    upsert(args: {
      where: Record<string, unknown>;
      create: unknown;
      update: unknown;
    }): Promise<unknown>;
  },
  rows: readonly T[],
  toArgs: (row: T) => {
    where: Record<string, unknown>;
    create: unknown;
    update: unknown;
  },
): Promise<void> {
  for (let start = 0; start < rows.length; start += SEED_BATCH_SIZE) {
    const chunk = rows.slice(start, start + SEED_BATCH_SIZE);

    await prisma.$transaction(
      chunk.map((row) => delegate.upsert(toArgs(row))),
    );
  }
}
