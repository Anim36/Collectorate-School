import "dotenv/config";

import { createCheckStudent, removeCheckStudent } from "./b5-check-student";

/**
 * Puts the check student in place and takes it away again.
 *
 * Usage: npx tsx scripts/qa/b5-student-setup.ts up|down
 */

const mode = process.argv[2] ?? "up";

/**
 * Runs the setup.
 *
 * The script is run through tsx, which compiles it as CommonJS, so the work
 * happens inside an async function rather than at the top level.
 */
async function main(): Promise<void> {
  if (mode === "down") {
    await removeCheckStudent();
    console.log("The check student is removed.");
    return;
  }

  await createCheckStudent();
}

void main();
