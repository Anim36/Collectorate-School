// Prisma configuration for the Narail Collectorate School web app.
//
// Prisma 7 loads this file instead of reading the datasource URL from
// `package.json` or from the schema itself. The CLI looks for the file in
// the project root, trying `prisma7.config.ts` first and `prisma.config.ts`
// after it, and uses the first one it finds.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // The command `prisma db seed` runs. It re-seeds the database from
    // `prisma/seed.ts` after the migrations are applied.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `env()` fails with a clear message when DATABASE_URL is missing, which
    // is easier to act on than a connection error further down the line.
    url: env("DATABASE_URL"),
    // The database Prisma replays the migrations on to work out what the
    // next migration should contain. It is dropped and rebuilt every time.
    // It is optional: only the commands that diff the migrations need it.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
