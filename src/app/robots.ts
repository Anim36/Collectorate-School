import type { MetadataRoute } from "next";

/**
 * The robots file of the site.
 *
 * The public pages are open to every crawler. The signed-in portals and the
 * admin panel hold personal records — results, fees, attendance, accounts —
 * so no crawler is welcome there, and they are disallowed here as well as
 * being kept out of the sitemap.
 */

/** The paths no crawler may ask for. */
const DISALLOWED = [
  "/student",
  "/teacher",
  "/admin",
  "/login",
  "/change-password",
  "/design-system",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...DISALLOWED],
    },
  };
}
