import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The file storage layer.
 *
 * This is the only place in the codebase that touches the file system. Every
 * other module goes through it, so the storage can later be swapped for
 * Cloudinary or S3 by replacing this one file.
 *
 * The files live in an `uploads` folder at the project root, never under
 * `public`. Nothing that is written here is served by the web server directly:
 * the files are handed out by the route handler in `src/app/api/files/[id]`,
 * which decides who may see each one.
 */

/** The folder the uploads are written to, relative to the project root. */
const UPLOAD_FOLDER = "uploads";

/** The kinds of file the school accepts. */
export type StoredFileKind = "image" | "document";

/** A file that passed the checks and is ready to be written. */
export interface StoredFileInput {
  /** The bytes of the file. */
  bytes: Buffer;
  /** The name the browser sent. It is only used as display metadata. */
  originalName: string;
}

/** A file that was written to the storage. */
export interface StoredFileResult {
  /** The random name the file was written under. */
  storageKey: string;
  /** The name of the file, cleaned up for the display. */
  originalName: string;
  /** The type that was verified from the bytes. */
  mimeType: string;
  /** The size of the file in bytes. */
  sizeBytes: number;
}

/** The reason a file was refused. */
export type StorageRejection =
  | "EMPTY"
  | "TOO_LARGE"
  | "TOO_MANY"
  | "UNKNOWN_TYPE";

/** The answer of the storage when a file is refused. */
export interface StorageFailure {
  ok: false;
  /** The machine readable reason. */
  reason: StorageRejection;
  /** The message the admin reads. */
  error: string;
}

/** The answer of the storage when a file is written. */
export interface StorageSuccess {
  ok: true;
  data: StoredFileResult;
}

/** The answer of the storage. */
export type StorageOutcome = StorageSuccess | StorageFailure;

/** The largest image the school accepts, in bytes. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The largest document the school accepts, in bytes. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** The largest number of files one request may carry. */
export const MAX_FILES_PER_REQUEST = 10;

/** The type of a file, worked out from the bytes of the file. */
export interface VerifiedType {
  /** The type that was verified. */
  mimeType: string;
  /** Whether the file is an image or a document. */
  kind: StoredFileKind;
  /** The extension that goes with the type. */
  extension: string;
}

/**
 * The magic bytes of the file types the school accepts.
 *
 * The bytes are checked, not the extension and not the type the browser sent,
 * so a file that is renamed to `.jpg` is still refused when it is not a
 * picture.
 */
const SIGNATURES: {
  /** The bytes the file has to start with. */
  magic: number[];
  /** The bytes that may follow the magic bytes. */
  offset?: number;
  /** The bytes that follow, and the value they have to hold. */
  follow?: { at: number; bytes: number[] };
  /** The type the signature means. */
  mimeType: string;
  /** The extension that goes with the type. */
  extension: string;
  /** Whether the file is an image or a document. */
  kind: StoredFileKind;
}[] = [
  {
    // JPEG: FF D8 FF
    magic: [0xff, 0xd8, 0xff],
    mimeType: "image/jpeg",
    extension: "jpg",
    kind: "image",
  },
  {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    mimeType: "image/png",
    extension: "png",
    kind: "image",
  },
  {
    // WebP: "RIFF" .... "WEBP"
    magic: [0x52, 0x49, 0x46, 0x46],
    offset: 8,
    follow: { at: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
    mimeType: "image/webp",
    extension: "webp",
    kind: "image",
  },
  {
    // PDF: "%PDF-"
    magic: [0x25, 0x50, 0x44, 0x46, 0x2d],
    mimeType: "application/pdf",
    extension: "pdf",
    kind: "document",
  },
];

/**
 * The type of a file, worked out from its bytes.
 *
 * Returns null when the bytes are not one of the accepted types. An SVG is
 * not one of them, so it is refused here as well.
 */
export function verifyFileType(bytes: Buffer): VerifiedType | null {
  for (const signature of SIGNATURES) {
    if (bytes.length < signature.magic.length) continue;

    const startsWithMagic = signature.magic.every(
      (byte, index) => bytes[index] === byte,
    );

    if (!startsWithMagic) continue;

    if (signature.follow) {
      const { at, bytes: expected } = signature.follow;

      if (bytes.length < at + expected.length) continue;

      const matches = expected.every((byte, index) => bytes[at + index] === byte);

      if (!matches) continue;
    }

    return {
      mimeType: signature.mimeType,
      kind: signature.kind,
      extension: signature.extension,
    };
  }

  return null;
}

/**
 * The name of a file, cleaned up for the display.
 *
 * The path is thrown away, the control characters are dropped and the name is
 * cut short, so a name that was sent by the browser can never carry a path
 * into the database or into a header.
 */
export function sanitizeOriginalName(name: string): string {
  // The path is thrown away, on both the Windows and the POSIX separator.
  const base = name.split(/[\\/]/).pop() ?? "";

  // The control characters and the characters that break a header are dropped.
  const cleaned = Array.from(base)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;

      return code > 31 && code !== 127 && character !== '"';
    })
    .join("")
    .trim();

  if (cleaned === "" || cleaned === "." || cleaned === "..") {
    return "upload";
  }

  return cleaned.slice(0, 120);
}

/**
 * The name a file is written under.
 *
 * It is random, so the name of the file on disk never comes from the browser
 * and a file can never overwrite another one.
 */
function newStorageKey(extension: string): string {
  return `${Date.now().toString(36)}-${randomBytes(16).toString("hex")}.${extension}`;
}

/** The folder the uploads are written to. */
function uploadFolder(): string {
  return join(process.cwd(), UPLOAD_FOLDER);
}

/**
 * Checks a file and writes it.
 *
 * The type is worked out from the bytes, the size is checked against the
 * limit of the kind, and the file is written under a random name.
 */
export async function saveFile(input: StoredFileInput): Promise<StorageOutcome> {
  // An empty file is refused before its type is looked at, because a file
  // without bytes has no type to verify.
  if (input.bytes.length === 0) {
    return { ok: false, reason: "EMPTY", error: "That file is empty." };
  }

  const verified = verifyFileType(input.bytes);

  if (!verified) {
    return {
      ok: false,
      reason: "UNKNOWN_TYPE",
      error:
        "That file is not a JPEG, PNG, WebP or PDF. Only those types are accepted.",
    };
  }

  const limit = verified.kind === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;

  if (input.bytes.length > limit) {
    return {
      ok: false,
      reason: "TOO_LARGE",
      error:
        verified.kind === "image"
          ? "That image is larger than 5 MB. Please upload a smaller one."
          : "That document is larger than 10 MB. Please upload a smaller one.",
    };
  }

  const storageKey = newStorageKey(verified.extension);

  await mkdir(uploadFolder(), { recursive: true });

  await writeFile(join(uploadFolder(), storageKey), input.bytes);

  return {
    ok: true,
    data: {
      storageKey,
      originalName: sanitizeOriginalName(input.originalName),
      mimeType: verified.mimeType,
      sizeBytes: input.bytes.length,
    },
  };
}

/**
 * Reads a file back.
 *
 * The key comes from the database, but it is checked once more here, so a row
 * that was tampered with cannot read a file outside the uploads folder.
 */
export async function readFileBytes(storageKey: string): Promise<Buffer | null> {
  const safeKey = sanitizeOriginalName(storageKey);

  if (safeKey !== storageKey || safeKey === "upload") return null;

  try {
    return await readFile(join(uploadFolder(), safeKey));
  } catch {
    return null;
  }
}

/**
 * The names of the files the storage holds.
 *
 * The database is the record of what the school owns; this list is what is
 * actually on the disk. The difference is the orphan a sweep removes.
 */
export async function listStoredFileKeys(): Promise<string[]> {
  try {
    const entries = await readdir(uploadFolder(), { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Removes a file from the storage.
 *
 * A file that is already gone is not an error: the row is the record of what
 * the school has, and it can be removed on its own.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  const safeKey = sanitizeOriginalName(storageKey);

  if (safeKey !== storageKey || safeKey === "upload") return;

  try {
    await unlink(join(uploadFolder(), safeKey));
  } catch {
    // The file is already gone.
  }
}
