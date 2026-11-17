import { unstable_cache } from "next/cache";

import { prisma } from "@/server/db";
import { CACHE_TAGS } from "@/server/cache-tags";
import { listPublicGalleryMoments } from "@/server/services/public-gallery";
import { listPublicHomeNotices } from "@/server/services/public-notices";
import type { PublicHomeData } from "@/types/public";

/**
 * The home page's database reads.
 *
 * The notices, the quick-access tiles, the "school at a glance" figures and
 * the gallery preview all come from rows, each through an explicit
 * allow-list. The counts the hero shows are the figures the school keeps in
 * `school_stats`, so they follow the rows instead of a copy in the code.
 */

/** How long a cached read may serve before it is read again. */
const REVALIDATE_SECONDS = 300;

/** The tiles of the quick-access row, as the school keeps them. */
async function listQuickLinks(): Promise<PublicHomeData["quickLinks"]> {
  const cached = unstable_cache(
    async () => {
      const rows = await prisma.quickLink.findMany({
        orderBy: { position: "asc" },
        // The allow-list of a quick link: the words, the route and the name
        // of the icon. Nothing else leaves the table.
        select: { label: true, href: true, icon: true },
      });

      return rows.map((row) => ({
        label: row.label,
        href: row.href,
        icon: row.icon ?? "",
      }));
    },
    ["public-quick-links"],
    { tags: [CACHE_TAGS.home], revalidate: REVALIDATE_SECONDS },
  );

  return cached();
}

/** The "school at a glance" figures, as the school keeps them. */
async function listSchoolStats(): Promise<PublicHomeData["schoolStats"]> {
  const cached = unstable_cache(
    async () => {
      const rows = await prisma.schoolStat.findMany({
        orderBy: { position: "asc" },
        // The allow-list of a figure: the number and its label.
        select: { value: true, label: true },
      });

      return rows.map((row) => ({ value: row.value, label: row.label }));
    },
    ["public-school-stats"],
    { tags: [CACHE_TAGS.home], revalidate: REVALIDATE_SECONDS },
  );

  return cached();
}

/**
 * Everything the home page needs from the database, in the four reads the
 * page makes and no more.
 */
export async function getPublicHomeData(): Promise<PublicHomeData> {
  const [notices, quickLinks, schoolStats, galleryMoments] = await Promise.all([
    listPublicHomeNotices(4),
    listQuickLinks(),
    listSchoolStats(),
    listPublicGalleryMoments(4),
  ]);

  return { notices, quickLinks, schoolStats, galleryMoments };
}
