import { unstable_cache } from "next/cache";

import { prisma } from "@/server/db";
import { htmlToText } from "@/server/sanitize";
import { CACHE_TAGS } from "@/server/cache-tags";
import type {
  PublicHomeNotice,
  PublicNoticeAttachment,
  PublicNoticeBoard,
  PublicNoticeDetail,
  PublicNoticeRow,
} from "@/types/public";

/**
 * The notices an anonymous visitor may read.
 *
 * Only a published notice that is addressed to everybody is public: the
 * audience rule is part of every query, so a draft — and a notice addressed
 * only to students, guardians or staff — is never read here, whatever id or
 * filter a request carries.
 *
 * Every read is an explicit allow-list of fields. A public notice carries no
 * author, no draft state and nothing about accounts: only what the board and
 * the article show.
 */

/** How long a cached read may serve before it is read again. */
const REVALIDATE_SECONDS = 300;

/** The condition that picks the notices the public may read. */
function publicNoticesWhere() {
  return {
    status: "PUBLISHED" as const,
    OR: [
      { audience: "PUBLIC" as const },
      { audiences: { hasSome: ["PUBLIC" as const] } },
    ],
  };
}

/** The date a notice was published, e.g. "04 Nov 2026". */
function longLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** The short date a table row shows, e.g. "04 Nov". */
function shortLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** The ISO date the filters and the routes work with, `yyyy-mm-dd`. */
function isoDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** The categories the board offers, the reset entry first. */
async function listCategories(): Promise<string[]> {
  const rows = await prisma.notice.findMany({
    where: publicNoticesWhere(),
    distinct: ["category"],
    orderBy: { category: "asc" },
    select: { category: true },
  });

  return ["All categories", ...rows.map((row) => row.category)];
}

/**
 * The public notice board: one page of rows with the real counts behind it.
 *
 * The search, the category and the date range are conditions of the query,
 * so the count under the table is the number of notices that really match
 * and not the number that happen to be on the page.
 */
export interface PublicNoticeBoardInput {
  query?: string;
  category?: string;
  from?: string;
  to?: string;
  page?: number;
}

/**
 * The uncached board read.
 *
 * Exported beside the cached read so the QA checks can call the query
 * itself: `unstable_cache` only works inside a request, and the checks run
 * as a plain script.
 */
export async function loadPublicNoticeBoard(
  input: PublicNoticeBoardInput,
): Promise<PublicNoticeBoard> {
  const pageSize = 6;
  const page = Math.max(0, Math.floor(input.page ?? 0));

  const categories = await listCategories();

  const category =
    input.category && categories.includes(input.category)
      ? input.category
      : "";

  const from = /^\d{4}-\d{2}-\d{2}$/.test(input.from ?? "")
    ? new Date(`${input.from}T00:00:00.000Z`)
    : null;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(input.to ?? "")
    ? new Date(`${input.to}T00:00:00.000Z`)
    : null;

  const needle = (input.query ?? "").trim().slice(0, 120);

  const conditions: Record<string, unknown>[] = [publicNoticesWhere()];

  if (category) conditions.push({ category });

  if (from || to) {
    conditions.push({
      publishedOn: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    });
  }

  if (needle) {
    conditions.push({
      OR: [
        { title: { contains: needle, mode: "insensitive" } },
        { category: { contains: needle, mode: "insensitive" } },
        { body: { contains: needle, mode: "insensitive" } },
      ],
    });
  }

  const where = { AND: conditions };

  const [total, notices] = await Promise.all([
    prisma.notice.count({ where }),
    prisma.notice.findMany({
      where,
      orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      skip: page * pageSize,
      take: pageSize,
      // The allow-list of the board row: nothing else leaves the table.
      select: {
        id: true,
        title: true,
        category: true,
        publishedOn: true,
        body: true,
        attachments: {
          orderBy: { name: "asc" },
          select: { name: true, format: true, size: true, fileId: true },
        },
      },
    }),
  ]);

  const rows: PublicNoticeRow[] = notices.map((notice) => ({
    id: notice.id,
    publishedOn: isoDate(notice.publishedOn),
    publishedLabel: notice.publishedOn ? longLabel(notice.publishedOn) : "",
    shortLabel: notice.publishedOn ? shortLabel(notice.publishedOn) : "",
    category: notice.category,
    title: notice.title,
    searchText: htmlToText(notice.body),
    attachments: notice.attachments.map((attachment) => ({
      name: attachment.name,
      format: attachment.format ?? "FILE",
      size: attachment.size ?? "",
      fileId: attachment.fileId ?? undefined,
    })),
  }));

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    categories,
  };
}

export async function getPublicNoticeBoard(
  input: PublicNoticeBoardInput = {},
): Promise<PublicNoticeBoard> {
  const cached = unstable_cache(
    loadPublicNoticeBoard,
    ["public-notice-board", JSON.stringify(input)],
    { tags: [CACHE_TAGS.notices], revalidate: REVALIDATE_SECONDS },
  );

  return cached(input);
}

/**
 * One public notice in full.
 *
 * A notice that is a draft, or that is not addressed to the public, is
 * reported the same way as one that does not exist, so an id cannot be
 * probed.
 */
/** The uncached detail read, exported for the QA checks. */
export async function loadPublicNotice(
  noticeId: string,
): Promise<PublicNoticeDetail | null> {
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, ...publicNoticesWhere() },
    // The allow-list of the article: the copy of the notice and its
    // attachments, nothing about the author or the draft state.
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
      eyebrow: true,
      greeting: true,
      signature: true,
      publishedOn: true,
      attachments: {
        orderBy: { name: "asc" },
        select: {
          name: true,
          format: true,
          size: true,
          fileId: true,
        },
      },
    },
  });

  if (!notice) return null;

  const attachments: PublicNoticeAttachment[] = notice.attachments.map(
    (attachment) => ({
      name: attachment.name,
      format: attachment.format ?? "FILE",
      size: attachment.size ?? "",
      fileId: attachment.fileId ?? undefined,
    }),
  );

  return {
    id: notice.id,
    publishedOn: isoDate(notice.publishedOn),
    publishedLabel: notice.publishedOn
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(notice.publishedOn)
      : "",
    category: notice.category,
    title: notice.title,
    eyebrow: notice.eyebrow ?? "",
    greeting: notice.greeting ?? "",
    body: [notice.body],
    signature: notice.signature ?? "",
    attachments,
  };
}

export async function getPublicNotice(
  noticeId: string,
): Promise<PublicNoticeDetail | null> {
  const cached = unstable_cache(
    loadPublicNotice,
    ["public-notice-detail", noticeId],
    { tags: [CACHE_TAGS.notices], revalidate: REVALIDATE_SECONDS },
  );

  return cached(noticeId);
}

/**
 * How many public notices are published.
 *
 * The navbar bell shows the number, so it is counted from the rows the
 * school really holds, and the count only covers notices anybody may read.
 */
export async function countPublicNotices(): Promise<number> {
  const cached = unstable_cache(
    async (): Promise<number> => {
      return prisma.notice.count({ where: publicNoticesWhere() });
    },
    ["public-notice-count"],
    { tags: [CACHE_TAGS.notices], revalidate: REVALIDATE_SECONDS },
  );

  return cached();
}

/**
 * The latest public notices, for the home "What's Happening" row.
 *
 * The tab of each card follows the category of the notice, and every notice
 * also appears under "Notices", the way the Figma frames group them.
 */
/** The uncached home-notices read, exported for the QA checks. */
export async function loadPublicHomeNotices(
  limit = 4,
): Promise<PublicHomeNotice[]> {
  const notices = await prisma.notice.findMany({
    where: publicNoticesWhere(),
    orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      publishedOn: true,
      body: true,
    },
  });

  return notices.map((notice) => {
    const tab =
      notice.category === "Event"
        ? "Events"
        : notice.category === "Holiday"
          ? "Holidays"
          : notice.category === "Achievement"
            ? "Achievements"
            : "Notices";

    return {
      date: notice.publishedOn
        ? longLabel(notice.publishedOn).toUpperCase()
        : "",
      category: notice.category.toUpperCase(),
      title: notice.title,
      description: htmlToText(notice.body).slice(0, 140),
      href: `/notice/${notice.id}`,
      tabs: ["Notices", tab],
    };
  });
}

export async function listPublicHomeNotices(limit = 4): Promise<
  PublicHomeNotice[]
> {
  const cached = unstable_cache(
    loadPublicHomeNotices,
    ["public-home-notices", String(limit)],
    { tags: [CACHE_TAGS.notices], revalidate: REVALIDATE_SECONDS },
  );

  return cached(limit);
}
