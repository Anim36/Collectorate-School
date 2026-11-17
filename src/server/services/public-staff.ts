import { unstable_cache } from "next/cache";

import { prisma } from "@/server/db";
import { CACHE_TAGS } from "@/server/cache-tags";
import { MAX_LIST_ROWS } from "@/server/limits";
import { staffTabs, type StaffGroup } from "@/types/public";
import type { PublicStaffMember } from "@/types/public";

/**
 * The staff directory an anonymous visitor may read.
 *
 * The page shows a name, a designation, a subject and a photograph — that is
 * the whole allow-list. A phone number is not part of the `staff` row and is
 * not published, and an email address is only shown when the school decides
 * to publish one: there is no public-contact flag yet, so no email leaves
 * the service, and the card simply shows none.
 */

/** How long a cached read may serve before it is read again. */
const REVALIDATE_SECONDS = 300;

/** The directory a staff type appears under. */
function groupOf(staffType: string): StaffGroup {
  switch (staffType) {
    case "OFFICER":
      return "Officers";
    case "SUPPORT":
      return "Support Staff";
    default:
      return "Teachers";
  }
}

/**
 * The members of the staff directory, in the order the school set.
 */
/** The uncached staff read, exported for the QA checks. */
export async function loadPublicStaff(): Promise<PublicStaffMember[]> {
  const rows = await prisma.staff.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    take: MAX_LIST_ROWS,
    // The allow-list of a staff member: the words on the card and the
    // portrait. No email, no phone, no department account.
    select: {
      id: true,
      name: true,
      designation: true,
      subject: true,
      staffType: true,
      photoUrl: true,
      photoWidth: true,
      photoHeight: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    designation: row.designation,
    subject: row.subject ?? "",
    group: groupOf(row.staffType),
    imageSrc: row.photoUrl ?? "/images/teacher.jpg",
    imageAlt: `Portrait of ${row.name}, ${row.designation}`,
    imageWidth: row.photoWidth ?? 1024,
    imageHeight: row.photoHeight ?? 1024,
  }));
}

export async function listPublicStaff(): Promise<PublicStaffMember[]> {
  const cached = unstable_cache(loadPublicStaff, ["public-staff"], {
    tags: [CACHE_TAGS.staff],
    revalidate: REVALIDATE_SECONDS,
  });

  return cached();
}

/**
 * The subjects the subject filter offers, the reset entry first, worked out
 * from the rows the school holds.
 */
export async function listPublicStaffSubjects(): Promise<string[]> {
  const cached = unstable_cache(
    async (): Promise<string[]> => {
      const rows = await prisma.staff.findMany({
        where: { subject: { not: null } },
        distinct: ["subject"],
        orderBy: { subject: "asc" },
        take: MAX_LIST_ROWS,
        select: { subject: true },
      });

      return [
        "All subjects",
        ...rows.map((row) => row.subject).filter((s): s is string => Boolean(s)),
      ];
    },
    ["public-staff-subjects"],
    { tags: [CACHE_TAGS.staff], revalidate: REVALIDATE_SECONDS },
  );

  return cached();
}

export { staffTabs };
