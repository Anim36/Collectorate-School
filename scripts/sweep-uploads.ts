import "dotenv/config";

import { prisma } from "../src/server/db";
import { sweepOrphanUploads } from "../src/server/services/files";

/**
 * Removes the files in `uploads/` that no `stored_files` row points at.
 *
 * It is safe to run at any time. A file that is still being uploaded has a
 * row before its bytes are written, so a live upload is never swept.
 */
async function main(): Promise<void> {
  try {
    const result = await sweepOrphanUploads();

    console.log(
      `Swept ${result.scanned} file(s); removed ${result.removed.length} orphan(s).`,
    );

    for (const key of result.removed) console.log(`  removed ${key}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Sweep failed.");
  process.exitCode = 1;
});
