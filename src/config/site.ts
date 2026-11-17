/**
 * The public identity of the school.
 *
 * Every place that names the school — the page titles, the metadata, the
 * login pages, the footer and the printed receipt — reads its words from
 * this one file, so the site cannot drift into a second spelling of its own
 * name.
 *
 * The contact details below are PLACEHOLDERS carried over from the design
 * frames. The school office has to replace them with the real values before
 * the site goes live. Each one is marked, and the list of what is still
 * wanted is in `docs/DECISIONS.md`.
 */

export const SITE = {
  /** The full name of the school, as every page titles it. */
  name: "Narail Collectorate School",
  /** The short name, for the places the full name does not fit. */
  shortName: "NCS",
  /** The line under the name in the footer. */
  tagline: "Learning today. Leading tomorrow.",

  /**
   * PLACEHOLDER — the real address of the school.
   */
  addressLine: "Dhanmondi, Dhaka 1209",
  /** The short form of the address, as the map card shows it. */
  addressShort: "Dhanmondi, Dhaka",

  /**
   * PLACEHOLDER — the real office phone.
   */
  phone: "+880 2 5500 1200",
  /**
   * PLACEHOLDER — the real office email.
   */
  email: "info@school.edu.bd",

  /**
   * PLACEHOLDER — the school's own pages on the platforms it keeps.
   */
  social: {
    facebook: "https://facebook.com",
    youtube: "https://youtube.com",
  },

  /**
   * PLACEHOLDER — the year the school was established. The hero says
   * "Committed to Excellence Since …" and the footer counts the years of
   * the school from it.
   */
  establishedYear: 1998,

  /**
   * PLACEHOLDER — the canonical address of the site once it is deployed.
   * The metadata and the sitemap build their absolute links from it.
   */
  url: "https://www.narail-collectorate-school.example.com",
} as const;

/** The line the hero shows under the headline. */
export const EXCELLENCE_LINE = `Committed to Excellence Since ${SITE.establishedYear}`;

/** The default description shared by the public pages. */
export const SITE_DESCRIPTION =
  "Learning today. Leading tomorrow. A digital campus for students, teachers and administrators.";

/** Builds the absolute URL of a path of the site. */
export function siteUrl(path = "/"): string {
  const base = SITE.url.endsWith("/") ? SITE.url.slice(0, -1) : SITE.url;
  const suffix = path.startsWith("/") ? path : `/${path}`;

  return `${base}${suffix}`;
}
