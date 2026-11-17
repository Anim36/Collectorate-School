/**
 * The guard around a database that may be erased.
 *
 * `db:reset` and the demo seed write demo accounts and delete rows. They are
 * useful on a developer machine and unacceptable against the school's real
 * database, so both refuse to run when the process is production or when the
 * connection string is not a local one.
 *
 * An explicit override is available for a staging machine:
 *
 *   ALLOW_NON_LOCAL_DB=1 npm run db:reset
 *   npm run db:reset -- --allow-remote
 */

/** The flag that says "I know what this does". */
const OVERRIDE_FLAG = "--allow-remote";

/** Whether the override was given. */
export function hasDestructiveOverride(): boolean {
  return (
    process.env.ALLOW_NON_LOCAL_DB === "1" ||
    process.env.ALLOW_NON_LOCAL_DB === "true" ||
    process.argv.includes(OVERRIDE_FLAG)
  );
}

/** The host of the connection string. */
export function databaseHost(connectionString: string): string {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
}

/** Whether the host is the local machine. */
export function isLocalHost(host: string): boolean {
  const normalised = host.toLowerCase();

  return (
    normalised === "localhost" ||
    normalised === "127.0.0.1" ||
    normalised === "::1" ||
    normalised === "[::1]"
  );
}

/**
 * Refuses a destructive command unless it is safe.
 *
 * Throws with a message that names the reason and never the connection
 * string, because the string carries the database password.
 */
export function assertDestructiveDatabaseAllowed(action: string): void {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      `${action} refused: DATABASE_URL is not set. Copy .env.example to .env.`,
    );
  }

  if (hasDestructiveOverride()) {
    console.warn(
      `${action}: ALLOW_NON_LOCAL_DB is set, so the guard is off. Make sure this is not the school's real database.`,
    );
    return;
  }

  if ((process.env.NODE_ENV ?? "development") === "production") {
    throw new Error(
      `${action} refused: NODE_ENV=production. Set ALLOW_NON_LOCAL_DB=1 only if this is a disposable staging database.`,
    );
  }

  const host = databaseHost(connectionString);

  if (!isLocalHost(host)) {
    throw new Error(
      `${action} refused: DATABASE_URL does not point at localhost. Set ALLOW_NON_LOCAL_DB=1 only if this is a disposable staging database.`,
    );
  }
}
