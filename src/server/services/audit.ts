import { prisma } from "@/server/db";

/**
 * The audit log.
 *
 * Every important write of the admin screens records a row here, so the school
 * can see who changed what and when. The write never breaks the change it
 * records: if the audit row cannot be written, the change still stands.
 */

/** What an audit row records. */
export interface AuditInput {
  /** The account that made the change. */
  actorId: string;
  /** What happened, e.g. "Notice published". */
  action: string;
  /** The kind of thing that was changed, e.g. "Notice". */
  entityType: string;
  /** The id of the thing that was changed. */
  entityId: string;
  /** Anything else worth keeping. Never a password or a hash. */
  metadata?: Record<string, unknown>;
}

/**
 * The keys whose value is never written to the audit log.
 *
 * The read side redacts the same keys again, because a row written before
 * this check existed may still hold one. Writing the check as well means a
 * new caller cannot add a password or a token by mistake.
 */
const SENSITIVE_KEYS = [
  "password",
  "passwordhash",
  "passwd",
  "hash",
  "secret",
  "token",
  "card",
  "cardnumber",
  "cardno",
  "cardlast4",
  "cvc",
  "cvv",
  "pin",
  "otp",
  "transaction",
  "mobile",
  "phone",
  "email",
  "address",
  "guardian",
];

/** Whether a key names something that must not be kept. */
function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase().replace(/[^a-z]/g, "");

  return SENSITIVE_KEYS.some((sensitive) => lower.includes(sensitive));
}

/**
 * A metadata object that is safe to store.
 *
 * A sensitive value becomes "[redacted]", a long string is cut short, and a
 * nested object is cleaned the same way. The audit log records what changed,
 * not the personal data or the credential behind it.
 */
function safeMetadata(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => safeMetadata(entry, depth + 1));
  }

  if (typeof value === "object") {
    if (depth >= 3) return "[object]";

    const cleaned: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      cleaned[key] = isSensitiveKey(key)
        ? "[redacted]"
        : safeMetadata(entry, depth + 1);
    }

    return cleaned;
  }

  return undefined;
}

/**
 * Writes an audit row.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: safeMetadata(input.metadata ?? {}) as never,
      },
    });
  } catch {
    // The audit write must never break the change it records.
  }
}
