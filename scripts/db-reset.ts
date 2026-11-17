import "dotenv/config";

import { spawnSync } from "node:child_process";

import { assertDestructiveDatabaseAllowed } from "./db-guard";

/**
 * `npm run db:reset` with a guard.
 *
 * `prisma migrate reset --force` drops the schema and `prisma db seed` writes
 * the demo data. Both are refused on production and on a connection string
 * that is not localhost, unless ALLOW_NON_LOCAL_DB is set deliberately.
 */
function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main(): void {
  assertDestructiveDatabaseAllowed("db:reset");

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";

  run(npx, ["prisma", "migrate", "reset", "--force", "--skip-seed"]);
  run(npx, ["prisma", "db", "seed"]);
}

main();
