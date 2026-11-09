import "dotenv/config";

import { prisma } from "@/server/db";

/**
 * A one-off check that the Prisma client can write to PostgreSQL and read
 * the rows back. Run it with:
 *
 *   npx tsx scripts/check-db.ts
 */
async function main(): Promise<void> {
  const [users, classes, sections, students, notices] = await Promise.all([
    prisma.user.count(),
    prisma.class.count(),
    prisma.section.count(),
    prisma.student.count(),
    prisma.notice.count(),
  ]);

  // A round trip through a write and a delete proves the connection can
  // take writes, not only reads.
  const probe = await prisma.class.create({
    data: { id: "db-check", name: "DB check", sortOrder: 99 },
  });

  await prisma.class.delete({ where: { id: probe.id } });

  console.log(
    JSON.stringify({ users, classes, sections, students, notices }, null, 2),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
