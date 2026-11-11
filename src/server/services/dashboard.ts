import { prisma } from "@/server/db";
import { formatTakaCompact, poishaToTaka } from "@/lib/money";
import { actionLabel } from "@/server/services/audit-log";
import type {
  AdminActivityRow,
  AdminAttentionRow,
  AdminDashboardData,
  AdminFeeMonth,
  AdminMetric,
} from "@/types/admin-11c";

/**
 * The dashboard of the admin portal.
 *
 * Every figure on the page is worked out by the database, so the cards, the
 * chart and the two tables show the school as it really is:
 *
 * - the counts are counts of rows,
 * - the money is an integer number of poisha and never a float,
 * - the recent activity is the audit log, read from the database.
 */

/** The number of months the fee chart covers. */
const CHART_MONTHS = 6;

/** The height of the tallest bar the chart draws, in pixels. */
const MAX_BAR_HEIGHT = 182;

/** The height of the shortest bar that is still drawn, in pixels. */
const MIN_BAR_HEIGHT = 4;

/**
 * The number of rows the "Recent activity" table holds.
 *
 * Figma draws three rows, and the table keeps the height of the frame that
 * way, so the table is a preview of the audit log rather than the whole of it.
 */
const ACTIVITY_ROWS = 3;

/**
 * A short taka amount, e.g. "৳ 875K".
 *
 * The metric cards hold the whole collection of the school, so the figure is
 * shortened to keep the card one line.
 */
function compactPoisha(poisha: number): string {
  return formatTakaCompact(poishaToTaka(poisha));
}

/**
 * The first day of the month, at midnight.
 */
function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

/**
 * The months the chart covers, the oldest first.
 *
 * The window ends with the current month, so the chart always shows the six
 * months the school is living through.
 */
function chartMonths(now: Date): { key: string; label: string; start: Date }[] {
  const months: { key: string; label: string; start: Date }[] = [];

  for (let offset = CHART_MONTHS - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );

    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    months.push({
      key,
      label: date.toLocaleDateString("en-GB", {
        month: "short",
        timeZone: "UTC",
      }),
      start: startOfMonth(date.getUTCFullYear(), date.getUTCMonth()),
    });
  }

  return months;
}

/**
 * The key of the month a date belongs to, e.g. "2026-11".
 */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The metric cards of the dashboard.
 *
 * The student and the teacher counts are counts of rows, and the two fee
 * figures cover the month the school is in.
 */
export async function dashboardMetrics(): Promise<AdminMetric[]> {
  const now = new Date();
  const monthStart = startOfMonth(now.getUTCFullYear(), now.getUTCMonth());
  const nextMonth = startOfMonth(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
  );

  const [students, classes, teachers, billed, collected] = await Promise.all([
    prisma.student.count(),
    prisma.class.count(),
    prisma.teacher.count({ where: { user: { isActive: true } } }),
    prisma.fee.aggregate({
      where: { dueDate: { gte: monthStart, lt: nextMonth } },
      _sum: { amountPoisha: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        paidAt: { gte: monthStart, lt: nextMonth },
      },
      _sum: { amountPoisha: true },
    }),
  ]);

  const billedPoisha = billed._sum.amountPoisha ?? 0;
  const collectedPoisha = collected._sum.amountPoisha ?? 0;

  const rate =
    billedPoisha === 0
      ? 0
      : Math.round((collectedPoisha / billedPoisha) * 1000) / 10;

  return [
    {
      label: "Students",
      value: students.toLocaleString("en-US"),
      hint: `Across ${classes} classes`,
    },
    {
      label: "Teachers",
      value: teachers.toLocaleString("en-US"),
      hint: "Active teaching staff",
    },
    {
      label: "Fees collected",
      value: compactPoisha(collectedPoisha),
      hint: "This month",
    },
    {
      label: "Collection rate",
      value: `${rate}%`,
      hint: `${compactPoisha(billedPoisha)} billed`,
    },
  ];
}

/**
 * The six months of the fee collection chart.
 *
 * The bars are drawn from the money that was really collected in each month,
 * and the tallest bar of the window is the tallest bar Figma draws.
 */
export async function feeCollectionMonths(): Promise<AdminFeeMonth[]> {
  const now = new Date();
  const months = chartMonths(now);

  const windowStart = months[0]?.start ?? startOfMonth(now.getUTCFullYear(), 0);
  const windowEnd = startOfMonth(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
  );

  const payments = await prisma.payment.findMany({
    where: {
      status: "COMPLETED",
      paidAt: { gte: windowStart, lt: windowEnd },
    },
    select: { paidAt: true, amountPoisha: true },
  });

  const totals = new Map<string, number>();

  for (const payment of payments) {
    if (!payment.paidAt) continue;

    const key = monthKey(payment.paidAt);

    totals.set(key, (totals.get(key) ?? 0) + payment.amountPoisha);
  }

  const amounts = months.map(
    (month) => totals.get(month.key) ?? 0,
  );

  const largest = Math.max(...amounts, 0);

  return months.map((month, index) => {
    const amountPoisha = amounts[index] ?? 0;

    const barHeight =
      largest === 0
        ? 0
        : Math.max(
            MIN_BAR_HEIGHT,
            Math.round((amountPoisha / largest) * MAX_BAR_HEIGHT),
          );

    return {
      label: month.label,
      amountPoisha,
      amount: compactPoisha(amountPoisha),
      barHeight,
    };
  });
}

/**
 * The rows of the "Attention needed" table.
 *
 * Every row counts the records that really wait for the admin.
 */
export async function attentionRows(): Promise<AdminAttentionRow[]> {
  const [unpaid, drafts, photos] = await Promise.all([
    prisma.fee.findMany({
      where: { status: { not: "PAID" } },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
    prisma.notice.count({ where: { status: "DRAFT" } }),
    prisma.galleryPhoto.count({ where: { status: "PENDING" } }),
  ]);

  return [
    {
      id: "attention-unpaid-fees",
      task: "Unpaid fees",
      count: `${unpaid.length} student${unpaid.length === 1 ? "" : "s"}`,
      action: "Review payments",
    },
    {
      id: "attention-draft-notices",
      task: "Draft notices",
      count: `${drafts} notice${drafts === 1 ? "" : "s"}`,
      action: "Continue editing",
    },
    {
      id: "attention-photographs",
      task: "Photographs to approve",
      count: `${photos} photograph${photos === 1 ? "" : "s"}`,
      action: "Review photographs",
    },
  ];
}

/**
 * The rows of the "Recent activity" table.
 *
 * The rows are the newest events of the audit log, so the table shows what
 * really happened in the school.
 */
export async function recentActivity(): Promise<AdminActivityRow[]> {
  const events = await prisma.auditLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: ACTIVITY_ROWS,
    select: {
      id: true,
      action: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    time: event.createdAt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }),
    user: event.actor?.name ?? "Unknown actor",
    activity: actionLabel(event.action),
  }));
}

/**
 * Everything the admin dashboard shows, read in one go.
 */
export async function getDashboardData(): Promise<AdminDashboardData> {
  const [metrics, months, attention, activity] = await Promise.all([
    dashboardMetrics(),
    feeCollectionMonths(),
    attentionRows(),
    recentActivity(),
  ]);

  return { metrics, months, attention, activity };
}
