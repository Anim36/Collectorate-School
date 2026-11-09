import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * The Prisma client every server-side module uses.
 *
 * Next.js reloads modules on every edit in development, so the client is
 * parked on `globalThis`: without this the dev server opens a new pool on
 * each reload until PostgreSQL refuses the connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Reads the connection string from the environment.
 *
 * Next.js loads `.env` before the server starts, so the variable is there
 * by the time this runs.
 */
function connectionString(): string {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }

  return value;
}

/**
 * Builds a client on the PostgreSQL driver adapter.
 *
 * Prisma 7 talks to the database through the adapter, which owns the
 * connection pool and closes it with the client.
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: connectionString() });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * The shared client.
 *
 * One client per process means one connection pool per process.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
