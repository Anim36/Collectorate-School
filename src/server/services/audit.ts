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
        metadata: (input.metadata ?? {}) as never,
      },
    });
  } catch {
    // The audit write must never break the change it records.
  }
}
