import { revalidateTag } from "next/cache";

/**
 * The cache tags of the public pages.
 *
 * The public pages read the school through cached queries, each one tagged
 * with the kind of rows it reads. An admin write calls `revalidateTag`, so
 * the change appears on the public pages the next time they are asked for,
 * instead of waiting for the revalidation window to run out.
 */

export const CACHE_TAGS = {
  notices: "notices",
  gallery: "gallery",
  routine: "routine",
  calendar: "calendar",
  fees: "fees",
  staff: "staff",
  home: "home",
} as const;

/** One cache tag of the public pages. */
export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Drops the cached public reads of one tag.
 *
 * The admin services call this after a write has succeeded, so a failure
 * never leaves the public pages showing rows that are no longer there.
 */
export function revalidatePublicCache(tag: CacheTag): void {
  revalidateTag(tag);
}
