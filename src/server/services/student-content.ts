import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/server/db";
import { htmlToText } from "@/server/sanitize";
import { requireStudent } from "@/server/services/student-identity";
import { studentNoticeFilterSchema } from "@/server/services/student-schemas";
import type {
  StudentGalleryAlbum,
  StudentNoticeBoard,
  StudentNoticeDetail,
  StudentNoticeFilterInput,
  StudentNoticeRow,
} from "@/types/student";

/**
 * The notices and the photographs the student may read.
 *
 * A notice is shown when it is published and when it is addressed to
 * students or to the public; a photograph is shown when it is approved. Both
 * rules are part of the query, so a draft notice or an unapproved
 * photograph is never read.
 */

/** The audiences a student may read. */
const STUDENT_AUDIENCES = ["PUBLIC", "STUDENTS"] as const;

/**
 * The date a notice was published, as the tables show it, e.g. "04 Nov".
 */
function shortDate(date: Date | null): string {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The date a notice was published, as the detail page writes it,
 * e.g. "04 November 2026".
 */
function longDate(date: Date | null): string {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The condition that picks the notices a student may read.
 *
 * It is written once and used by every read, so the board, the count and the
 * detail page always agree on which notices exist for the student.
 */
function studentNoticesWhere(): Prisma.NoticeWhereInput {
  return {
    status: "PUBLISHED",
    OR: [
      { audience: { in: [...STUDENT_AUDIENCES] } },
      { audiences: { hasSome: [...STUDENT_AUDIENCES] } },
    ],
  };
}

/**
 * The published notices the student may read, newest first.
 */
export async function listStudentNotices(): Promise<StudentNoticeRow[]> {
  const identity = await requireStudent();

  if (!identity.ok) return [];

  const notices = await prisma.notice.findMany({
    where: studentNoticesWhere(),
    orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      category: true,
      publishedOn: true,
      body: true,
    },
  });

  return notices.map((notice) => ({
    id: notice.id,
    date: shortDate(notice.publishedOn),
    publishedOn: notice.publishedOn
      ? notice.publishedOn.toISOString().slice(0, 10)
      : "",
    category: notice.category,
    title: notice.title,
    searchText: htmlToText(notice.body),
  }));
}

/**
 * The number of notices that were published in the last seven days.
 *
 * The count is made by the database, over the notices the student may read,
 * so the figure on the dashboard is the number of notices that really arrived.
 * The window is read-only: no GET page writes anything, so the figure is the
 * same on every read and the dashboard does not need a visit to be recorded.
 */
export async function countStudentNoticesSince(): Promise<number> {
  // The window is seven days long, ending now.
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return prisma.notice.count({
    where: {
      ...studentNoticesWhere(),
      publishedOn: { gte: from },
    },
  });
}

/**
 * The notice board of the student, with the page it shows.
 *
 * The filters run in the database, so the count under the table is the number
 * of notices that really match and not the number of notices that happen to
 * be on the page. The search runs over the headline, the category and the
 * body of the notice.
 */
export async function getStudentNoticeBoard(
  raw: Partial<StudentNoticeFilterInput> = {},
): Promise<StudentNoticeBoard> {
  const identity = await requireStudent();

  if (!identity.ok) {
    return {
      rows: [],
      total: 0,
      page: 0,
      pageSize: 3,
      pageCount: 1,
      categories: ["All categories"],
    };
  }

  const parsed = studentNoticeFilterSchema.safeParse(raw);

  const input = parsed.success
    ? parsed.data
    : studentNoticeFilterSchema.parse({});

  const categories = await listStudentNoticeCategories();

  // The category of the filter is only used when the notice board really has
  // it, so a category that no longer exists shows the whole board rather than
  // an empty one.
  const category =
    input.category && categories.includes(input.category)
      ? input.category
      : "";

  const from = input.from ? new Date(`${input.from}T00:00:00.000Z`) : null;
  const to = input.to ? new Date(`${input.to}T00:00:00.000Z`) : null;

  const needle = input.query ?? "";

  // The audience rule and the search are both conditions, so a search never
  // throws the audience rule away: they are joined with `AND`.
  const conditions: Prisma.NoticeWhereInput[] = [studentNoticesWhere()];

  if (category) {
    conditions.push({ category });
  }

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
        { title: { contains: needle, mode: "insensitive" as const } },
        { category: { contains: needle, mode: "insensitive" as const } },
        { body: { contains: needle, mode: "insensitive" as const } },
      ],
    });
  }

  const where: Prisma.NoticeWhereInput = { AND: conditions };

  const [total, notices] = await Promise.all([
    prisma.notice.count({ where }),
    prisma.notice.findMany({
      where,
      orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }],
      // The id is the last tiebreaker, so the order is total: two notices
      // published on the same day cannot swap places between two reads and
      // one notice would then appear on two pages and on none.
      skip: input.page * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        title: true,
        category: true,
        publishedOn: true,
        body: true,
      },
    }),
  ]);

  const rows: StudentNoticeRow[] = notices.map((notice) => ({
    id: notice.id,
    date: shortDate(notice.publishedOn),
    publishedOn: notice.publishedOn
      ? notice.publishedOn.toISOString().slice(0, 10)
      : "",
    category: notice.category,
    title: notice.title,
    searchText: htmlToText(notice.body),
  }));

  return {
    rows,
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    categories,
  };
}

/**
 * One notice, when the student may read it.
 *
 * A notice that is a draft, or that is addressed to other people only, is
 * reported the same way as one that does not exist, so an id cannot be
 * probed.
 */
export async function getStudentNotice(
  noticeId: string,
): Promise<StudentNoticeDetail | null> {
  const identity = await requireStudent();

  if (!identity.ok) return null;

  const notice = await prisma.notice.findFirst({
    where: {
      id: noticeId,
      AND: [studentNoticesWhere()],
    },
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
          id: true,
          name: true,
          format: true,
          size: true,
          fileId: true,
        },
      },
    },
  });

  if (!notice) return null;

  return {
    id: notice.id,
    publishedOn: notice.publishedOn
      ? notice.publishedOn.toISOString().slice(0, 10)
      : "",
    publishedLabel: longDate(notice.publishedOn),
    category: notice.category,
    title: notice.title,
    eyebrow: notice.eyebrow ?? "",
    greeting: notice.greeting ?? "",
    body: [notice.body],
    signature: notice.signature ?? "",
    attachments: notice.attachments.map((attachment) => ({
      name: attachment.name,
      format: attachment.format ?? "FILE",
      size: attachment.size ?? "",
      // An attachment that was never really uploaded has no file behind it, so
      // it carries no id and the table shows its name without a dead link.
      fileId: attachment.fileId ?? undefined,
    })),
  };
}

/**
 * The categories the notice filter offers.
 */
export async function listStudentNoticeCategories(): Promise<string[]> {
  const categories = await prisma.notice.findMany({
    where: studentNoticesWhere(),
    distinct: ["category"],
    orderBy: { category: "asc" },
    select: { category: true },
  });

  return ["All categories", ...categories.map((entry) => entry.category)];
}

/**
 * The albums the student may see, with their approved photographs.
 *
 * Only an approved photograph is read, so a photograph that waits for the
 * admin never reaches the portal.
 */
export async function listStudentGalleryAlbums(): Promise<
  StudentGalleryAlbum[]
> {
  const identity = await requireStudent();

  if (!identity.ok) return [];

  const albums = await prisma.galleryAlbum.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      category: true,
      photoCount: true,
      publishedOn: true,
      photos: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          url: true,
          caption: true,
          name: true,
          width: true,
          height: true,
        },
      },
    },
  });

  return albums
    .map((album) => ({
      id: album.slug || album.id,
      title: album.title,
      // The count is the one the school holds on the album, so the line under
      // the title is the same number the admin gallery shows.
      meta: `School memories · ${album.photoCount} photos`,
      description: album.description ?? "",
      date: longDate(album.publishedOn),
      photoCount: album.photoCount,
      category: album.category ?? "Academic",
      photos: album.photos.map((photo) => ({
        src: photo.url,
        alt: photo.caption ?? photo.name ?? album.title,
        width: photo.width ?? 1200,
        height: photo.height ?? 800,
      })),
    }))
    .filter((album) => album.photos.length > 0);
}

/**
 * One album, when the student may see it.
 *
 * The album is looked up with its own rule in the query, so an album that is
 * not public — or one that holds no approved photograph — is reported the
 * same way as one that does not exist.
 */
export async function getStudentGalleryAlbum(
  albumId: string,
): Promise<StudentGalleryAlbum | null> {
  const identity = await requireStudent();

  if (!identity.ok) return null;

  const album = await prisma.galleryAlbum.findFirst({
    where: {
      OR: [{ slug: albumId }, { id: albumId }],
      visibility: "PUBLIC",
      photos: { some: { status: "APPROVED" } },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      category: true,
      photoCount: true,
      publishedOn: true,
      photos: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          url: true,
          caption: true,
          name: true,
          width: true,
          height: true,
        },
      },
    },
  });

  if (!album) return null;

  return {
    id: album.slug || album.id,
    title: album.title,
    meta: `School memories · ${album.photoCount} photos`,
    description: album.description ?? "",
    date: longDate(album.publishedOn),
    photoCount: album.photoCount,
    category: album.category ?? "Academic",
    photos: album.photos.map((photo) => ({
      src: photo.url,
      alt: photo.caption ?? photo.name ?? album.title,
      width: photo.width ?? 1200,
      height: photo.height ?? 800,
    })),
  };
}
