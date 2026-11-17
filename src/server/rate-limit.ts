import { headers } from "next/headers";

import { prisma } from "@/server/db";

/**
 * The small rate limiter.
 *
 * It is database-backed so that every application instance counts the same
 * attempts. A purely in-memory limiter would be per process: with two
 * instances behind a load balancer an attacker would get twice the limit, and
 * a restart would clear it. The cost is one count and one insert per guarded
 * action, which is acceptable for the handful of actions below.
 *
 * The caveat, written down in `docs/SECURITY.md`: the limiter is only as good
 * as the address it buckets on. Behind a proxy the first `X-Forwarded-For`
 * entry is used; a deployment that does not set that header correctly should
 * treat the limit as a per-account limit instead.
 */

/** One guarded action, with the limit the school chose. */
export interface RateLimitRule {
  /** How many attempts are allowed inside the window. */
  limit: number;
  /** The window, in milliseconds. */
  windowMs: number;
}

/** The guarded actions and their limits. */
export const RATE_LIMIT_RULES = {
  /** Sign-in: 50 attempts per 15 minutes per address. */
  login: { limit: 50, windowMs: 15 * 60 * 1000 },
  /** Changing a password: 20 attempts per 15 minutes per address. */
  "change-password": { limit: 20, windowMs: 15 * 60 * 1000 },
  /** Submitting a payment: 20 requests per hour per address. */
  "payment-request": { limit: 20, windowMs: 60 * 60 * 1000 },
  /** Uploading files: 40 requests per hour per address. */
  upload: { limit: 40, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

/** The actions that are guarded. */
export type RateLimitAction = keyof typeof RATE_LIMIT_RULES;

/** What a check answers. */
export interface RateLimitResult {
  /** Whether the attempt may go ahead. */
  allowed: boolean;
  /** The seconds to wait, when it may not. */
  retryAfterSeconds: number;
  /** How many attempts were seen in the window, including this one. */
  count: number;
  /** The limit that applies. */
  limit: number;
}

/** The address a request came from, as far as the proxy tells us. */
export async function clientAddress(): Promise<string> {
  const store = await headers();

  const forwarded = store.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();

    if (first) return first;
  }

  // Next.js does not expose the socket address to a server action, so this is
  // the best available fallback. A nil address still rate-limits the whole
  // process rather than nothing.
  return store.get("x-real-ip") ?? "unknown";
}

/**
 * Builds the bucket for an action.
 *
 * A signed-in action uses the account, so two users behind the same school
 * address do not spend each other's budget. Sign-in has no account yet, so it
 * uses the address.
 */
export async function rateLimitBucket(userId?: string): Promise<string> {
  if (userId) return `user:${userId}`;

  return `ip:${await clientAddress()}`;
}

/**
 * Counts an attempt and says whether it may go ahead.
 *
 * The attempt is recorded only when it is allowed, so a blocked address does
 * not extend its own window with every retry.
 */
export async function checkRateLimit(
  action: RateLimitAction,
  bucket: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMIT_RULES[action];
  const now = new Date();
  const since = new Date(now.getTime() - rule.windowMs);

  const [count, oldest] = await Promise.all([
    prisma.rateLimitAttempt.count({
      where: { action, bucket, createdAt: { gte: since } },
    }),
    prisma.rateLimitAttempt.findFirst({
      where: { action, bucket, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  if (count >= rule.limit) {
    const retryAfterSeconds = oldest
      ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + rule.windowMs - now.getTime()) / 1000))
      : Math.ceil(rule.windowMs / 1000);

    return { allowed: false, retryAfterSeconds, count, limit: rule.limit };
  }

  await prisma.rateLimitAttempt.create({ data: { action, bucket } });

  // The table is a rolling window, not a ledger. An occasional sweep keeps it
  // small without a cron job; a missed sweep only costs disk.
  if (Math.random() < 0.02) {
    await prisma.rateLimitAttempt.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    });
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    count: count + 1,
    limit: rule.limit,
  };
}

/** The generic message a limited caller gets. */
export const RATE_LIMIT_MESSAGE =
  "Too many attempts. Please wait a few minutes and try again.";
