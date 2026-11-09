import sanitizeHtml from "sanitize-html";

/**
 * The HTML sanitizer of the notice body.
 *
 * The rich text editor sends HTML. It is cleaned here, on the server, before
 * it is written to the database, so nothing that is not on the allow list ever
 * reaches the page.
 *
 * Only the basic formatting of a notice is allowed: paragraphs, line breaks,
 * bold, italic, lists, two levels of heading, links and quotes. Scripts, event
 * handlers, styles and frames are stripped.
 */

/** The tags a notice body may hold. */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "blockquote",
  "a",
];

/**
 * The attributes a tag may hold.
 *
 * The `rel` and the `target` of a link are on the list, because the
 * transform below puts them there and the allow list would otherwise take
 * them off again.
 */
const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "rel", "target"],
};

/** The schemes a link may use. */
const ALLOWED_SCHEMES = ["http", "https", "mailto"];

/**
 * The links a notice body may carry.
 *
 * Every link opens in a new tab and cannot reach the page that opened it.
 */
const ALLOWED_SCHEMES_BY_TAG: sanitizeHtml.IOptions["allowedSchemesByTag"] = {
  a: ALLOWED_SCHEMES,
};

/**
 * Cleans the HTML of a notice body.
 *
 * The result is safe to render: the allow list decides the tags, the schemes
 * decide the links, and the styles and the event handlers are dropped.
 */
export function sanitizeNoticeHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: ALLOWED_SCHEMES_BY_TAG,
    allowProtocolRelative: false,
    // The styles are never kept, on the tags or in the style attribute.
    allowedStyles: {},
    disallowedTagsMode: "discard",
    transformTags: {
      // Every link opens in a new tab and cannot reach the page that opened it.
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    },
  });
}

/**
 * The plain text of an HTML body.
 *
 * It is used for the summary of a notice and for the check that a body is not
 * empty, because a body that holds only markup is not a body.
 */
export function htmlToText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
