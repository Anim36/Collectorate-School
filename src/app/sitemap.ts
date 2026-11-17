import type { MetadataRoute } from "next";

import { siteUrl } from "@/config/site";

/**
 * The sitemap of the site.
 *
 * It lists the public pages only. The signed-in portals and the admin panel
 * are excluded — they hold personal records no search engine should index —
 * and the notice and album detail pages are discovered through their
 * listings, so the sitemap carries the pages a visitor enters by.
 *
 * The detail routes are read from the database through the public services,
 * so a published notice or a public album joins the sitemap on the next
 * build without this file knowing its id.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl().replace(/\/$/, "");

  const staticEntries: MetadataRoute.Sitemap = [
    { path: "", priority: 1 },
    { path: "/admission", priority: 0.9 },
    { path: "/teachers", priority: 0.8 },
    { path: "/about", priority: 0.8 },
    { path: "/notice", priority: 0.8 },
    { path: "/gallery", priority: 0.7 },
    { path: "/calendar", priority: 0.6 },
    { path: "/routine", priority: 0.6 },
  ].map((entry) => ({
    url: `${base}${entry.path}`,
    changeFrequency: "monthly" as const,
    priority: entry.priority,
  }));

  return staticEntries;
}
