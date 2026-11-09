import { prisma } from "@/server/db";
import {
  deleteFile,
  readFileBytes,
  saveFile,
  MAX_FILES_PER_REQUEST,
} from "@/server/storage";
import { writeAudit } from "@/server/services/audit";
import type { ServiceResult } from "@/server/services/admin-11b-schemas";

/**
 * The uploaded files of the school.
 *
 * The bytes are written by the storage layer, never by a route or a page. The
 * row in the database is what decides who may see a file: a photograph that
 * has not been approved and an attachment of a notice that has not been
 * published are only served to an admin.
 */

/** The file that was handed to the service. */
export interface UploadedFile {
  /** The name the browser sent. It is only kept for the display. */
  name: string;
  /** The bytes of the file. */
  bytes: Buffer;
}

/**
 * A file that travelled from the browser.
 *
 * A server action carries JSON, so the bytes of a file cannot be sent as
 * they are: they travel as base64 text beside the name of the file. The
 * browser turns the file into this shape in `src/lib/file-transfer.ts`.
 */
export interface EncodedUpload {
  /** The name the browser sent. It is only kept for the display. */
  name: string;
  /** The bytes of the file, as base64 text. */
  base64: string;
}

/**
 * Turns the files that came from the browser into files the storage can
 * write.
 *
 * The base64 text is decoded here, on the server, and the size of the
 * decoded bytes is checked against the limit of the kind of the file before
 * anything is written to the disk.
 */
export function decodeUploads(files: readonly EncodedUpload[]): UploadedFile[] {
  return files.map((file) => ({
    name: file.name,
    bytes: Buffer.from(file.base64, "base64"),
  }));
}

/** A file that was written and can be linked to a notice or an album. */
export interface StoredFileRecord {
  /** The id of the stored file. */
  id: string;
  /** The name shown to the admin. */
  originalName: string;
  /** The type that was verified from the bytes. */
  mimeType: string;
  /** The size of the file in bytes. */
  sizeBytes: number;
}

/**
 * Writes a set of uploaded files.
 *
 * Every file is checked on its own: the type comes from the bytes and not
 * from the name, and the size has to fit the limit of the kind of the file.
 * When one file is refused, the files that were already written are removed
 * again, so a refused request leaves nothing behind.
 */
export async function storeUploads(
  actorId: string,
  files: UploadedFile[],
): Promise<ServiceResult<StoredFileRecord[]>> {
  if (files.length === 0) {
    return {
      ok: false,
      error: "Choose a file to upload.",
      reason: "INVALID",
    };
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return {
      ok: false,
      error: `Upload at most ${MAX_FILES_PER_REQUEST} files at a time.`,
      reason: "TOO_MANY",
    };
  }

  const written: { id: string; storageKey: string }[] = [];

  for (const file of files) {
    const outcome = await saveFile({
      bytes: file.bytes,
      originalName: file.name,
    });

    if (!outcome.ok) {
      // The files that were already written are taken off the disk again.
      for (const entry of written) {
        await deleteFile(entry.storageKey);
      }

      return { ok: false, error: outcome.error, reason: outcome.reason };
    }

    const record = await prisma.storedFile.create({
      data: {
        storageKey: outcome.data.storageKey,
        originalName: outcome.data.originalName,
        mimeType: outcome.data.mimeType,
        sizeBytes: outcome.data.sizeBytes,
        uploadedById: actorId,
      },
      select: { id: true, storageKey: true },
    });

    written.push(record);
  }

  const records: StoredFileRecord[] = await Promise.all(
    written.map(async (entry) => {
      const row = await prisma.storedFile.findUnique({
        where: { id: entry.id },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
        },
      });

      return {
        id: entry.id,
        originalName: row?.originalName ?? "upload",
        mimeType: row?.mimeType ?? "application/octet-stream",
        sizeBytes: row?.sizeBytes ?? 0,
      };
    }),
  );

  return { ok: true, data: records };
}

/**
 * Removes a stored file and its row.
 */
export async function removeStoredFile(
  actorId: string,
  fileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const file = await prisma.storedFile.findUnique({
    where: { id: fileId },
    select: { id: true, storageKey: true, originalName: true },
  });

  if (!file) {
    return { ok: false, error: "That file does not exist" };
  }

  await deleteFile(file.storageKey);

  await prisma.storedFile.delete({ where: { id: fileId } });

  await writeAudit({
    actorId,
    action: "File deleted",
    entityType: "Stored file",
    entityId: fileId,
    metadata: { name: file.originalName },
  });

  return { ok: true };
}

/**
 * Who may see a stored file.
 *
 * A photograph that has not been approved and an attachment of a notice that
 * has not been published are only served to an admin. Everything else is
 * served to the audience its notice was addressed to.
 */
export type FileVisibility =
  | { kind: "public" }
  | { kind: "audience"; audiences: string[] }
  | { kind: "admin-only" };

/**
 * The visibility of a stored file.
 */
export async function fileVisibility(
  fileId: string,
): Promise<FileVisibility | null> {
  const file = await prisma.storedFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      photos: {
        select: { status: true, album: { select: { visibility: true } } },
      },
      attachments: {
        select: {
          notice: {
            select: { status: true, audiences: true, audience: true },
          },
        },
      },
    },
  });

  if (!file) return null;

  // A photograph that has not been approved is only served to an admin.
  if (file.photos.length > 0) {
    const photo = file.photos[0];

    if (photo.status !== "APPROVED") {
      return { kind: "admin-only" };
    }

    if (photo.album.visibility === "TEACHERS") {
      return { kind: "audience", audiences: ["TEACHERS"] };
    }

    return { kind: "public" };
  }

  // The attachment of a notice that is not published is only served to an
  // admin.
  if (file.attachments.length > 0) {
    const attachment = file.attachments[0];
    const notice = attachment.notice;

    if (notice.status !== "PUBLISHED") {
      return { kind: "admin-only" };
    }

    const audiences = notice.audiences?.length
      ? notice.audiences
      : notice.audience
        ? [notice.audience]
        : ["PUBLIC"];

    if (audiences.includes("PUBLIC")) {
      return { kind: "public" };
    }

    return { kind: "audience", audiences };
  }

  // A file that is not linked to anything is only served to an admin.
  return { kind: "admin-only" };
}

/**
 * Reads the bytes of a stored file.
 */
export async function readStoredFile(
  fileId: string,
): Promise<{ bytes: Buffer; mimeType: string; name: string } | null> {
  const file = await prisma.storedFile.findUnique({
    where: { id: fileId },
    select: { id: true, storageKey: true, mimeType: true, originalName: true },
  });

  if (!file) return null;

  const bytes = await readFileBytes(file.storageKey);

  if (!bytes) return null;

  return {
    bytes,
    mimeType: file.mimeType,
    name: file.originalName,
  };
}

/**
 * A file size the way the admin reads it, e.g. "240 KB".
 *
 * The size is stored as a number of bytes, so it never goes through a float
 * on the way to the page.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes < 10 ? 1 : 0)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

/**
 * The short name of a file type, e.g. "PDF" or "JPG".
 *
 * It is only used for the display, so it is worked out from the type that was
 * verified when the file was uploaded.
 */
export function formatLabel(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "PDF";
    case "image/jpeg":
      return "JPG";
    case "image/png":
      return "PNG";
    case "image/webp":
      return "WEBP";
    default:
      return "FILE";
  }
}
