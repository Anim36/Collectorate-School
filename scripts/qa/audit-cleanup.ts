import { Prisma, type PrismaClient } from "../../src/generated/prisma/client";

/**
 * Removes the audit rows a check wrote.
 *
 * The `audit_log` table is append-only from B7 on: a database trigger refuses
 * every DELETE an ordinary caller makes. The checks still have to tidy up
 * after themselves, so they go through the one SQL function that turns the
 * transaction-local allowance on for its own statement. Nothing in the
 * application calls it; it exists for the QA scripts and can be dropped in
 * production.
 *
 * Usage:
 *
 *   await deleteQaAuditRows(prisma, { actorIds: [actorId] });
 *   await deleteQaAuditRows(prisma, { entityPrefix: PREFIX });
 */

/** The rows to remove. At least one filter has to be given. */
export interface AuditCleanupFilters {
  /** Rows whose own id is one of these ids. */
  rowIds?: string[];
  /** Rows whose actor is one of these accounts. */
  actorIds?: string[];
  /** Rows whose entity id is one of these ids. */
  entityIds?: string[];
  /** Rows whose entity id starts with this text. */
  entityPrefix?: string;
  /** Keep the seeded rows, whose id starts with `audit-`. */
  keepSeeded?: boolean;
}

/**
 * Deletes the matching audit rows and returns how many were removed.
 *
 * Throws when no filter is given, so a check cannot accidentally wipe the
 * whole table by passing an empty object.
 */
export async function deleteQaAuditRows(
  prisma: PrismaClient,
  filters: AuditCleanupFilters,
): Promise<number> {
  if (
    !filters.rowIds &&
    !filters.actorIds &&
    !filters.entityIds &&
    !filters.entityPrefix &&
    !filters.keepSeeded
  ) {
    throw new Error("deleteQaAuditRows needs at least one filter.");
  }

  const rows = await prisma.$queryRaw<{ deleted: number }[]>(
    Prisma.sql`
      SELECT qa_delete_audit_rows(
        ${filters.rowIds ?? null}::text[],
        ${filters.actorIds ?? null}::text[],
        ${filters.entityIds ?? null}::text[],
        ${filters.entityPrefix ?? null}::text,
        ${filters.keepSeeded ?? false}::boolean
      ) AS deleted
    `,
  );

  return rows[0]?.deleted ?? 0;
}
