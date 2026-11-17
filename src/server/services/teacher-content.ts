import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/server/db";
import {
  requireTeacher,
  teacherContextLine,
} from "@/server/services/teacher-identity";
import {
  teacherNoticeFilterSchema,
  type TeacherNoticeFilterInput,
} from "@/server/services/teacher-schemas";
import type {
  TeacherNoticeAudience,
  TeacherNoticeList,
  TeacherNoticeRow,
} from "@/types/teacher";

/**
 * The notices a teacher may read.
 *
 * A notice is shown when it is published and when it is addressed to the
 * teachers, to the students or to the public. The rule is part of the query,
 * so a draft notice and a notice for the guardians alone are never read.
 *
 * A teacher reads the notices of the students as well: the school does not
 * hide a notice from its own staff, and a notice about the examinations is
 * addressed to the teachers as much as to the pupils.
 */

/** The audiences a teacher may read. */
const TEACHER_AUDIENCES = ["PUBLIC", "STUDENTS", "TEACHERS"] as const;

/**
 * The audiences the teacher filters the board by, in the order Figma lists
 * them.
 */
export const TEACHER_NOTICE_AUDIENCES: readonly TeacherNoticeAudience[] = [
  "For teachers",
  "For students",
  "For everyone",
];

/**
 * The audience of the database behind the three filters of the page.
 */
const AUDIENCE_OF_FILTER: Record<
  TeacherNoticeAudience,
  "TEACHERS" | "STUDENTS" | "PUBLIC"
> = {
  "For teachers": "TEACHERS",
  "For students": "STUDENTS",
  "For everyone": "PUBLIC",
};

/**
 * The date a notice was published, as the table shows it, e.g. "04 Nov".
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
 * The condition that picks the notices a teacher may read.
 */
function teacherNoticesWhere(): Prisma.NoticeWhereInput {
  return {
    status: "PUBLISHED",
    OR: [
      { audience: { in: [...TEACHER_AUDIENCES] } },
      { audiences: { hasSome: [...TEACHER_AUDIENCES] } },
    ],
  };
}

/**
 * The notice board of the teacher, with the page that was read.
 *
 * The filters run in the database, so the count under the table is the number
 * of notices that really match and not the number of notices that happen to
 * be on the page.
 */
export async function getTeacherNotices(
  raw: Partial<TeacherNoticeFilterInput> = {},
): Promise<TeacherNoticeList> {
  const teacher = await requireTeacher();

  if (!teacher.ok) {
    return {
      rows: [],
      total: 0,
      page: 0,
      pageSize: 6,
      pageCount: 1,
      audiences: [...TEACHER_NOTICE_AUDIENCES],
      audience: TEACHER_NOTICE_AUDIENCES[0],
      context: "",
    };
  }

  const parsed = teacherNoticeFilterSchema.safeParse(raw);

  const input = parsed.success
    ? parsed.data
    : teacherNoticeFilterSchema.parse({});

  // The audience the board is filtered by.
  const audience: TeacherNoticeAudience = input.audience
    ? input.audience
    : TEACHER_NOTICE_AUDIENCES[0];

  const needle = input.query ?? "";

  const conditions: Prisma.NoticeWhereInput[] = [
    teacherNoticesWhere(),
    {
      OR: [
        { audience: AUDIENCE_OF_FILTER[audience] },
        { audiences: { has: AUDIENCE_OF_FILTER[audience] } },
      ],
    },
  ];

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
      // published on the same day cannot swap places between two reads.
      skip: input.page * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        title: true,
        category: true,
        publishedOn: true,
      },
    }),
  ]);

  const rows: TeacherNoticeRow[] = notices.map((notice) => ({
    id: notice.id,
    date: shortDate(notice.publishedOn),
    category: notice.category,
    notice: notice.title,
  }));

  return {
    rows,
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    audiences: [...TEACHER_NOTICE_AUDIENCES],
    audience,
    context: teacherContextLine(teacher.data),
  };
}

/**
 * The number of notices the teacher may read that were published in the last
 * seven days.
 *
 * The count is made by the database and the window is read-only, so the
 * figure on the dashboard is the same on every read.
 */
export async function countTeacherNoticesSince(): Promise<number> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return 0;

  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return prisma.notice.count({
    where: {
      ...teacherNoticesWhere(),
      publishedOn: { gte: from },
    },
  });
}
