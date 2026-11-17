import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { deleteQaAuditRows } from "./audit-cleanup";

/**
 * Proves that audit_log is append-only in the database.
 * UPDATE and DELETE statements must be refused by the trigger.
 * The QA cleanup function qa_delete_audit_rows must succeed.
 */
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  console.log("Creating test audit row...");
  const row = await prisma.auditLog.create({
    data: {
      action: "Test append-only",
      entityType: "SecurityCheck",
      entityId: "sec-test-1",
      metadata: { check: "append-only" },
    },
  });
  console.log(`Row created: ${row.id}`);

  // Test 1: UPDATE must fail
  let updateRefused = false;
  try {
    await prisma.auditLog.update({
      where: { id: row.id },
      data: { action: "Tampered action" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    updateRefused = message.includes("audit_log is append-only");
    console.log(`UPDATE refusal verified: ${updateRefused}`);
  }

  if (!updateRefused) {
    throw new Error("FAIL: UPDATE was not refused by the trigger!");
  }

  // Test 2: DELETE must fail
  let deleteRefused = false;
  try {
    await prisma.auditLog.delete({
      where: { id: row.id },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    deleteRefused = message.includes("audit_log is append-only");
    console.log(`DELETE refusal verified: ${deleteRefused}`);
  }

  if (!deleteRefused) {
    throw new Error("FAIL: DELETE was not refused by the trigger!");
  }

  // Test 3: QA cleanup mechanism must succeed
  const deleted = await deleteQaAuditRows(prisma, { rowIds: [row.id] });
  console.log(`QA cleanup deleted: ${deleted} row(s)`);

  if (deleted !== 1) {
    throw new Error(`FAIL: Expected 1 row deleted by QA cleanup, got ${deleted}`);
  }

  console.log("PASS: audit_log append-only triggers are working as expected.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
