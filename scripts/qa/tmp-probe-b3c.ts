import "dotenv/config";

import { prisma } from "@/server/db";

async function main(): Promise<void> {
  const columns = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    "select column_name from information_schema.columns where table_name='fees'",
  );
  const counters = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    "select table_name from information_schema.tables where table_name='receipt_counters'",
  );
  const withPeriod = await prisma.$queryRawUnsafe<{ c: number }[]>(
    "select count(*)::int as c from fees where period is not null",
  );
  const receipts = await prisma.receipt.findMany({
    take: 3,
    select: { receiptNo: true, amountPoisha: true },
  });
  const fees = await prisma.fee.findMany({
    take: 3,
    select: {
      id: true,
      label: true,
      period: true,
      amountPoisha: true,
      status: true,
      invoiceNo: true,
    },
  });

  console.log(
    JSON.stringify({ columns, counters, withPeriod, receipts, fees }, null, 1),
  );

  await prisma.$disconnect();
}

void main();
