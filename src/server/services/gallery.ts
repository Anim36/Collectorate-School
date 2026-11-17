import { prisma } from "@/server/db";
import { MAX_LIST_ROWS } from "@/server/limits";
import {
  listAlbumsSchema,
  saveAlbumSchema,
  type SaveAlbumInput,
  type ServiceResult,
} from "@/server/services/admin-11b-schemas";
import { writeAudit } from "@/server/services/audit";
import {
  decodeUploads,
  formatBytes,
  removeStoredFile,
  storeUploads,
} from "@/server/services/files";
import type {
  AdminAlbumList as AlbumList,
  AdminAlbumRow as AlbumRow,
  AdminPhotoReviewRow as PhotoReviewRow,
} from "@/types/admin-11b";

/**
 * The gallery of the school.
 *
 * The albums, the photographs and the approval queue all live in the
 * database. A photograph that is not approved is never served to the public:
 * the file route and the read service both refuse it.
 */

/**
 * The albums of the school, filtered and counted by the database.
 */
export async function listAlbums(raw: {
  query?: string;
  category?: string;
} = {}): Promise<ServiceResult<AlbumList>> {
  const parsed = listAlbumsSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: "Those filters are not valid" };
  }

  const { query, category } = parsed.data;

  const where: Record<string, unknown> = {};

  if (category !== "ALL") where["category"] = category;

  const needle = query ?? "";

  if (needle !== "") {
    where["title"] = { contains: needle, mode: "insensitive" };
  }

  const [total, albums] = await Promise.all([
    prisma.galleryAlbum.count({ where }),
    prisma.galleryAlbum.findMany({
      where,
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        visibility: true,
        category: true,
        photoCount: true,
      },
    }),
  ]);

  const rows: AlbumRow[] = albums.map((album) => ({
    id: album.id,
    title: album.title,
    // The album keeps the number of photographs it holds on its own column,
    // so the count is the one the school sees rather than the number of rows
    // that happen to be in the table today.
    photoCount: album.photoCount,
    visibility: album.visibility === "PUBLIC" ? "Public" : "Teachers",
    category: album.category ?? "Academic",
  }));

  return { ok: true, data: { rows, total } };
}

/**
 * The photographs waiting for the admin.
 *
 * Only the pending photographs are listed, because the queue is the place
 * where the admin decides what the school publishes.
 */
export async function listPendingPhotos(): Promise<
  ServiceResult<PhotoReviewRow[]>
> {
  const photos = await prisma.galleryPhoto.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: MAX_LIST_ROWS,
    select: {
      id: true,
      name: true,
      size: true,
      status: true,
      reviewReason: true,
      fileId: true,
      album: { select: { title: true } },
    },
  });

  return {
    ok: true,
    data: photos.map((photo) => ({
      id: photo.id,
      name: photo.name ?? "Photograph",
      album: photo.album.title,
      size: photo.size ?? "",
      state:
        photo.status === "APPROVED"
          ? "Approved"
          : photo.status === "REJECTED"
            ? "Rejected"
            : "Awaiting admin approval",
      reason: photo.reviewReason,
      fileId: photo.fileId,
    })),
  };
}

/**
 * Creates an album or renames an existing one.
 */
export async function saveAlbum(
  actorId: string,
  raw: SaveAlbumInput,
): Promise<ServiceResult<{ id: string; title: string }>> {
  const parsed = saveAlbumSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That album is not valid",
    };
  }

  const input = parsed.data;

  try {
    if (input.id) {
      const existing = await prisma.galleryAlbum.findUnique({
        where: { id: input.id },
        select: { id: true, title: true },
      });

      if (!existing) {
        return { ok: false, error: "That album does not exist" };
      }

      await prisma.galleryAlbum.update({
        where: { id: input.id },
        data: {
          title: input.title,
          ...(input.category ? { category: input.category } : {}),
          visibility: input.visibility,
        },
      });

      await writeAudit({
        actorId,
        action: "Album renamed",
        entityType: "Gallery album",
        entityId: input.id,
        metadata: { title: input.title },
      });

      return { ok: true, data: { id: input.id, title: input.title } };
    }

    // The slug goes into the route of the public gallery, so it has to be
    // unique and it has to be readable.
    const slug = `${slugify(input.title)}-${Date.now().toString(36)}`;

    const created = await prisma.galleryAlbum.create({
      data: {
        title: input.title,
        slug,
        category: input.category ?? "Academic",
        visibility: input.visibility,
      },
      select: { id: true, title: true },
    });

    await writeAudit({
      actorId,
      action: "Album created",
      entityType: "Gallery album",
      entityId: created.id,
      metadata: { title: created.title },
    });

    return { ok: true, data: created };
  } catch {
    return { ok: false, error: "The album could not be saved" };
  }
}

/**
 * Removes an album.
 *
 * The album is only removed when it is empty: an album that still holds
 * photographs keeps them, so a photograph that is published cannot be lost
 * by a stray click.
 */
export async function deleteAlbum(
  actorId: string,
  albumId: string,
): Promise<ServiceResult<{ id: string }>> {
  const album = await prisma.galleryAlbum.findUnique({
    where: { id: albumId },
    select: {
      id: true,
      title: true,
      _count: { select: { photos: true } },
    },
  });

  if (!album) {
    return { ok: false, error: "That album does not exist" };
  }

  if (album._count.photos > 0) {
    return {
      ok: false,
      error:
        "That album still holds photographs. Remove them before deleting the album.",
    };
  }

  try {
    await prisma.galleryAlbum.delete({ where: { id: albumId } });
  } catch {
    return { ok: false, error: "That album could not be deleted" };
  }

  await writeAudit({
    actorId,
    action: "Album deleted",
    entityType: "Gallery album",
    entityId: albumId,
    metadata: { title: album.title },
  });

  return { ok: true, data: { id: albumId } };
}

/**
 * Approves a photograph.
 *
 * The photograph becomes visible in the album it was uploaded into.
 */
export async function approvePhoto(
  actorId: string,
  photoId: string,
): Promise<ServiceResult<{ id: string }>> {
  const photo = await prisma.galleryPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, name: true, status: true },
  });

  if (!photo) {
    return { ok: false, error: "That photograph does not exist" };
  }

  await prisma.galleryPhoto.update({
    where: { id: photoId },
    data: {
      status: "APPROVED",
      reviewedById: actorId,
      reviewedAt: new Date(),
      reviewReason: null,
    },
  });

  await writeAudit({
    actorId,
    action: "Photo approved",
    entityType: "Gallery photo",
    entityId: photoId,
    metadata: { name: photo.name },
  });

  return { ok: true, data: { id: photoId } };
}

/**
 * Sends a photograph back to the teacher who uploaded it.
 *
 * The reason is kept on the row, so the teacher can be told why.
 */
export async function rejectPhoto(
  actorId: string,
  photoId: string,
  reason?: string,
): Promise<ServiceResult<{ id: string }>> {
  const photo = await prisma.galleryPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, name: true },
  });

  if (!photo) {
    return { ok: false, error: "That photograph does not exist" };
  }

  const trimmed = reason?.trim().slice(0, 300) ?? "";

  await prisma.galleryPhoto.update({
    where: { id: photoId },
    data: {
      status: "REJECTED",
      reviewedById: actorId,
      reviewedAt: new Date(),
      reviewReason: trimmed === "" ? null : trimmed,
    },
  });

  await writeAudit({
    actorId,
    action: "Photo rejected",
    entityType: "Gallery photo",
    entityId: photoId,
    metadata: { name: photo.name },
  });

  return { ok: true, data: { id: photoId } };
}

/**
 * Removes a photograph from an album.
 *
 * The file behind the photograph is removed with it, so the storage does not
 * keep files nobody can reach.
 */
export async function deletePhoto(
  actorId: string,
  photoId: string,
): Promise<ServiceResult<{ id: string }>> {
  const photo = await prisma.galleryPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, name: true, fileId: true },
  });

  if (!photo) {
    return { ok: false, error: "That photograph does not exist" };
  }

  try {
    await prisma.galleryPhoto.delete({ where: { id: photoId } });
  } catch {
    return { ok: false, error: "That photograph could not be deleted" };
  }

  if (photo.fileId) {
    await removeStoredFile(actorId, photo.fileId);
  }

  await writeAudit({
    actorId,
    action: "Photo deleted",
    entityType: "Gallery photo",
    entityId: photoId,
    metadata: { name: photo.name },
  });

  return { ok: true, data: { id: photoId } };
}

/**
 * The name of a file, as a slug.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Uploads photographs into an album.
 *
 * The photographs an admin uploads are approved straight away, because the
 * admin is the one who decides what the school publishes. The files are
 * written to the storage first, so a file that is not one the school accepts
 * never reaches the database.
 */
export async function uploadPhotos(
  actorId: string,
  input: {
    albumId: string;
    files: { name: string; base64: string }[];
  },
): Promise<ServiceResult<{ uploaded: number }>> {
  const album = await prisma.galleryAlbum.findUnique({
    where: { id: input.albumId },
    select: { id: true, title: true },
  });

  if (!album) {
    return { ok: false, error: "That album does not exist" };
  }

  const stored = await storeUploads(actorId, decodeUploads(input.files));

  if (!stored.ok) return stored;

  const photos = stored.data!;

  for (const file of photos) {
    await prisma.galleryPhoto.create({
      data: {
        albumId: input.albumId,
        url: `/api/files/${file.id}`,
        caption: null,
        name: file.originalName,
        size: formatBytes(file.sizeBytes),
        status: "APPROVED",
        uploadedById: actorId,
        reviewedById: actorId,
        reviewedAt: new Date(),
        fileId: file.id,
      },
    });
  }

  await prisma.galleryAlbum.update({
    where: { id: input.albumId },
    data: { photoCount: { increment: photos.length } },
  });

  await writeAudit({
    actorId,
    action: "Photos uploaded",
    entityType: "Gallery album",
    entityId: input.albumId,
    metadata: {
      album: album.title,
      count: photos.length,
      names: photos.map((file) => file.originalName),
    },
  });

  return { ok: true, data: { uploaded: photos.length } };
}
