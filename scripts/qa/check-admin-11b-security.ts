import "dotenv/config";

import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import {
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  saveFile,
  verifyFileType,
} from "@/server/storage";
import { htmlToText, sanitizeNoticeHtml } from "@/server/sanitize";

/**
 * The acceptance checks of step B3B.
 *
 * They cover the upload security, the sanitizing of the notice body and the
 * rules the services hold. They run against the real database and clean up
 * after themselves.
 *
 * Usage: npx tsx scripts/qa/check-admin-11b-security.ts
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

/** A one-pixel PNG, used as the bytes of an accepted upload. */
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** A minimal PDF, used as the bytes of an accepted document. */
const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n");

/** The bytes of a Windows executable, whatever the name it is given. */
const EXE_BYTES = Buffer.from([
  0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff,
  0xff, 0x00, 0x00, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00,
  0x00, 0x00,
]);

/** The bytes of an SVG, which is markup and not a picture. */
const SVG_BYTES = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
);

/**
 * The name of the folder the uploads are written to.
 *
 * It is worked out the same way the storage works it out, so the check reads
 * the real folder rather than a guess.
 */
function uploadFolder(): string {
  return join(process.cwd(), "uploads");
}

/**
 * The files that are in the uploads folder.
 */
async function storedFiles(): Promise<string[]> {
  const entries = await readdir(uploadFolder()).catch(() => [] as string[]);

  return entries;
}

async function main(): Promise<void> {
  /* ------------------------------------------------- 1. upload security --- */

  // An executable that is named like a picture is refused, because the type
  // comes from the bytes and not from the name.
  const exe = await saveFile({
    bytes: EXE_BYTES,
    originalName: "virus.jpg",
  });

  check(
    "an .exe renamed to .jpg is refused",
    !exe.ok && exe.reason === "UNKNOWN_TYPE",
    exe.ok ? `accepted as ${exe.data.mimeType}` : exe.error,
  );

  // An SVG is refused as well.
  const svg = await saveFile({
    bytes: SVG_BYTES,
    originalName: "logo.svg",
  });

  check(
    "an SVG is refused",
    !svg.ok && svg.reason === "UNKNOWN_TYPE",
    svg.ok ? `accepted as ${svg.data.mimeType}` : svg.error,
  );

  check(
    "the SVG is refused by the type check itself",
    verifyFileType(SVG_BYTES) === null,
    "no type",
  );

  check(
    "the executable is refused by the type check itself",
    verifyFileType(EXE_BYTES) === null,
    "no type",
  );

  check(
    "a real PNG is accepted by the type check",
    verifyFileType(PNG_BYTES)?.mimeType === "image/png",
    verifyFileType(PNG_BYTES)?.mimeType ?? "no type",
  );

  // A file without bytes is refused as empty, before its type is looked at.
  const empty = await saveFile({
    bytes: Buffer.alloc(0),
    originalName: "empty.png",
  });

  check(
    "an empty file is refused",
    !empty.ok && empty.reason === "EMPTY",
    empty.ok ? "it was accepted" : empty.error,
  );

  check(
    "an empty file is refused before the type is looked at",
    empty.ok === false && empty.reason === "EMPTY",
    empty.ok ? "it was accepted" : empty.reason,
  );

  // An image over the limit is refused.
  const oversizedImage = await saveFile({
    bytes: Buffer.concat([PNG_BYTES, Buffer.alloc(MAX_IMAGE_BYTES + 1024)]),
    originalName: "huge.png",
  });

  check(
    "an oversized image is refused",
    !oversizedImage.ok && oversizedImage.reason === "TOO_LARGE",
    oversizedImage.ok ? "accepted" : oversizedImage.error,
  );

  // A document over the limit is refused.
  const oversizedDocument = await saveFile({
    bytes: Buffer.concat([
      PDF_BYTES,
      Buffer.alloc(MAX_DOCUMENT_BYTES + 1024),
    ]),
    originalName: "huge.pdf",
  });

  check(
    "an oversized PDF is refused",
    !oversizedDocument.ok && oversizedDocument.reason === "TOO_LARGE",
    oversizedDocument.ok ? "accepted" : oversizedDocument.error,
  );

  // A name that tries to walk out of the uploads folder is cleaned up.
  const traversal = await saveFile({
    bytes: PNG_BYTES,
    originalName: "../../x.png",
  });

  check(
    "a name that walks out of the folder is sanitized",
    traversal.ok &&
      traversal.data.originalName === "x.png" &&
      !traversal.data.originalName.includes(".."),
    traversal.ok ? traversal.data.originalName : traversal.error,
  );

  const windowsTraversal = await saveFile({
    bytes: PNG_BYTES,
    originalName: "..\\..\\x.png",
  });

  check(
    "a name that walks out of the folder on Windows is sanitized",
    windowsTraversal.ok && windowsTraversal.data.originalName === "x.png",
    windowsTraversal.ok ? windowsTraversal.data.originalName : windowsTraversal.error,
  );

  check(
    "a name with a path in it keeps only the file name",
    (await saveFile({
      bytes: PNG_BYTES,
      originalName: "C:\\Users\\school\\report.png",
    })).ok,
    "stored",
  );

  // The name on disk is random and never comes from the browser.
  const before = await storedFiles();

  const first = await saveFile({
    bytes: PNG_BYTES,
    originalName: "same-name.png",
  });

  const second = await saveFile({
    bytes: PNG_BYTES,
    originalName: "same-name.png",
  });

  const after = await storedFiles();

  check(
    "the name on disk is random",
    first.ok &&
      second.ok &&
      first.data.storageKey !== second.data.storageKey &&
      !first.data.storageKey.includes("same-name"),
    first.ok && second.ok
      ? `${first.data.storageKey} and ${second.data.storageKey}`
      : "not stored",
  );

  check(
    "two files of the same name do not overwrite each other",
    after.length === before.length + 2,
    `${before.length} before, ${after.length} after`,
  );

  // The name the browser sent is only kept as display metadata.
  const oddName = await saveFile({
    bytes: PNG_BYTES,
    originalName: '  report" \n\r.png  ',
  });

  check(
    "the original name is sanitized",
    oddName.ok &&
      oddName.data.originalName === "report .png" &&
      !oddName.data.originalName.includes('"') &&
      !oddName.data.originalName.includes("\n"),
    oddName.ok ? JSON.stringify(oddName.data.originalName) : oddName.error,
  );

  // Everything the check wrote is removed again.
  for (const outcome of [first, second, traversal, windowsTraversal, oddName]) {
    if (outcome.ok) {
      await rm(join(uploadFolder(), outcome.data.storageKey), { force: true });
    }
  }

  const stray = await saveFile({
    bytes: PNG_BYTES,
    originalName: "stray.png",
  });

  if (stray.ok) {
    await rm(join(uploadFolder(), stray.data.storageKey), { force: true });
  }

  const pathWalk = await saveFile({
    bytes: PNG_BYTES,
    originalName: "../../x.png",
  });

  if (pathWalk.ok) {
    await rm(join(uploadFolder(), pathWalk.data.storageKey), { force: true });
  }

  /* ------------------------------------------------ 2. rich text rules --- */

  const dirty =
    '<p onclick="alert(1)">Hello</p>' +
    '<script>alert(1)</script>' +
    '<img src="x" onerror="alert(1)" />' +
    '<a href="javascript:alert(1)">click</a>' +
    '<iframe src="https://evil.example"></iframe>' +
    '<p style="position:fixed">styled</p>';

  const cleaned = sanitizeNoticeHtml(dirty);

  check(
    "a script tag is stripped",
    !cleaned.toLowerCase().includes("<script"),
    cleaned,
  );

  check(
    "an onerror handler is stripped",
    !cleaned.toLowerCase().includes("onerror"),
    cleaned,
  );

  check(
    "an onclick handler is stripped",
    !cleaned.toLowerCase().includes("onclick"),
    cleaned,
  );

  check(
    "a javascript: link is stripped",
    !cleaned.toLowerCase().includes("javascript:"),
    cleaned,
  );

  check(
    "an iframe is stripped",
    !cleaned.toLowerCase().includes("<iframe"),
    cleaned,
  );

  check(
    "a style attribute is stripped",
    !cleaned.toLowerCase().includes("style="),
    cleaned,
  );

  const kept = sanitizeNoticeHtml(
    "<p>Hello <strong>world</strong></p><ul><li>One</li></ul><h2>Head</h2><blockquote>Quote</blockquote>",
  );

  for (const tag of ["<p>", "<strong>", "<ul>", "<li>", "<h2>", "<blockquote>"]) {
    check(
      `the allowed tag ${tag} survives`,
      kept.toLowerCase().includes(tag),
      kept,
    );
  }

  const link = sanitizeNoticeHtml('<a href="https://school.edu.bd">School</a>');

  check(
    "a link gets rel=\"noopener noreferrer\"",
    link.includes('rel="noopener noreferrer"'),
    link,
  );

  check(
    "a link gets target=\"_blank\"",
    link.includes('target="_blank"'),
    link,
  );

  const mailLink = sanitizeNoticeHtml('<a href="mailto:office@school.edu.bd">Mail</a>');

  check(
    "a mailto link survives",
    mailLink.includes("mailto:office@school.edu.bd"),
    mailLink,
  );

  const protocolRelative = sanitizeNoticeHtml(
    '<a href="//evil.example">Bad</a>',
  );

  check(
    "a protocol relative link is refused",
    !protocolRelative.includes("//evil.example"),
    protocolRelative,
  );

  check(
    "a body that holds only markup has no text",
    htmlToText("<p><br /></p>") === "",
    JSON.stringify(htmlToText("<p><br /></p>")),
  );

  check(
    "the text of a body is read without the markup",
    htmlToText("<p>Hello <strong>world</strong></p>") === "Hello world",
    JSON.stringify(htmlToText("<p>Hello <strong>world</strong></p>")),
  );

  /* --------------------------------------------------- 3. the storage ----- */

  const folder = await stat(uploadFolder()).catch(() => null);

  check("the uploads folder exists", folder !== null);

  await mkdir(uploadFolder(), { recursive: true });

  await prisma.$disconnect();

  const failed = results.filter((result) => !result.pass);

  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed.`,
  );

  if (failed.length > 0) process.exit(1);
}

void main();
