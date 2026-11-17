import { unstable_cache } from "next/cache";

import { prisma } from "@/server/db";
import { formatPoisha } from "@/lib/money";
import { CACHE_TAGS } from "@/server/cache-tags";
import type { PublicFeeRow } from "@/types/public";

/**
 * The fee table an anonymous visitor may read.
 *
 * The fee structure of every class the school teaches — Nursery, KG and
 * Class 1 to Class 10 — in the current academic year. The amounts are
 * integers of poisha in the database and are formatted into taka here, so a
 * float never touches an amount.
 *
 * The read is an explicit allow-list: the class name and the three fee
 * amounts. Nothing else about a fee structure leaves the table.
 */

/** How long a cached read may serve before it is read again. */
const REVALIDATE_SECONDS = 300;

/**
 * The fees of every class, in the order the school teaches them.
 */
/** The uncached fee read, exported for the QA checks. */
export async function loadPublicFees(): Promise<PublicFeeRow[]> {
  const rows = await prisma.class.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      name: true,
      feeStructures: {
        where: { academicYear: { isCurrent: true } },
        // The allow-list of a fee structure: the three amounts.
        select: {
          admissionFeePoisha: true,
          monthlyTuitionPoisha: true,
          activitiesPoisha: true,
        },
        take: 1,
      },
    },
  });

  return rows.map((row) => {
    const structure = row.feeStructures[0];

    return {
      className: row.name,
      admission: structure ? formatPoisha(structure.admissionFeePoisha) : "—",
      tuition: structure ? formatPoisha(structure.monthlyTuitionPoisha) : "—",
      activities: structure ? formatPoisha(structure.activitiesPoisha) : "—",
    };
  });
}

export async function listPublicFees(): Promise<PublicFeeRow[]> {
  const cached = unstable_cache(loadPublicFees, ["public-fees"], {
    tags: [CACHE_TAGS.fees],
    revalidate: REVALIDATE_SECONDS,
  });

  return cached();
}
