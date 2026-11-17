import { prisma } from "@/server/db";
import { MAX_LIST_ROWS } from "@/server/limits";
import { writeAudit } from "@/server/services/audit";
import {
  decodeUploads,
  formatBytes,
  storeUploads,
} from "@/server/services/files";
import {
  requireTeacher,
  teacherContextLine,
} from "@/server/services/teacher-identity";
import type { TeacherGalleryData, TeacherUploadRow } from "@/types/teacher";

/**
 * The gallery of the teacher.
 *
 * The teacher uploads photographs into an album. The photographs wait for the
 * admin, so they are written as pending and only an admin can see them until
 * they are approved.
 *
 * The files go through the storage layer, so the type is worked out from the
 * bytes of the file and not from the name the browser sent.
 */

/** The most photographs one request may carry. */
const MAX_PHOTOS_PER_REQUEST = 10;

/** The most photographs one teacher may upload in a day. */
const MAX_PHOTOS_PER_DAY = 30;

/** The cover an album without one is shown with. */
const FALLBACK_COVER = "/images/science-fair.jpg";

/** Where a photograph is in the approval flow, as the table shows it. */
function statusOf(status: string): TeacherUploadRow["status"] {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Sent back";
    default:
      return "Awaiting admin approval";
  }
}

/**
 * The gallery page: the albums, the uploads of the teacher and the preview of
 * the album that is open.
 */
export async function getTeacherGallery(
  albumId?: string,
): Promise<TeacherGalleryData | null> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return null;

  const albums = await prisma.galleryAlbum.findMany({
    orderBy: { title: "asc" },
    take: MAX_LIST_ROWS,
    select: {
      id: true,
      title: true,
      description: true,
      photoCount: true,
      coverUrl: true,
    },
  });

  const chosen =
    albums.find((album) => album.id === albumId) ?? albums[0] ?? null;

  // The teacher sees their own photographs and the approved ones of the
  // album. A photograph of another teacher that waits for the admin is never
  // read.
  const photos = chosen
    ? await prisma.galleryPhoto.findMany({
        where: {
          albumId: chosen.id,
          OR: [
            { status: "APPROVED" },
            { uploadedById: teacher.data.userId },
          ],
        },
        orderBy: [{ createdAt: "desc" }],
        take: MAX_LIST_ROWS,
        select: {
          id: true,
          name: true,
          size: true,
          status: true,
          url: true,
          caption: true,
          album: { select: { title: true } },
        },
      })
    : [];

  const uploads: TeacherUploadRow[] = photos.map((photo) => ({
    id: photo.id,
    name: photo.name ?? "Photograph",
    size: photo.size ?? "",
    status: statusOf(photo.status),
    album: photo.album.title,
    preview: photo.url,
    previewAlt: photo.caption ?? photo.name ?? photo.album.title,
  }));

  return {
    albums: albums.map((album) => ({
      id: album.id,
      title: album.title,
      description: album.description ?? "",
      photoCount: album.photoCount,
    })),
    uploads,
    albumId: chosen?.id ?? "",
    albumTitle: chosen?.title ?? "",
    preview: chosen?.coverUrl ?? FALLBACK_COVER,
    previewAlt: chosen?.title ?? "School album",
    photoCount: chosen?.photoCount ?? 0,
    context: teacherContextLine(teacher.data),
  };
}

/**
 * Uploads photographs into an album.
 *
 * The photographs wait for the admin, so they are written as pending. The
 * limit of the day keeps a teacher from filling the queue of the school in one
 * go.
 */
export async function uploadTeacherPhotos(
  input: { albumId: string; files: { name: string; base64: string }[] },
): Promise<{ ok: true; data: { uploaded: number } } | { ok: false; error: string }> {
  const teacher = await requireTeacher();

  if (!teacher.ok) return { ok: false, error: teacher.error };

  if (input.files.length === 0) {
    return { ok: false, error: "Choose a photograph to upload." };
  }

  if (input.files.length > MAX_PHOTOS_PER_REQUEST) {
    return {
      ok: false,
      error: `Upload at most ${MAX_PHOTOS_PER_REQUEST} photographs at a time.`,
    };
  }

  const album = await prisma.galleryAlbum.findUnique({
    where: { id: input.albumId },
    select: { id: true, title: true },
  });

  if (!album) {
    return { ok: false, error: "That album does not exist" };
  }

  // The limit of the day: the photographs the teacher uploaded today are
  // counted first.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const uploadedToday = await prisma.galleryPhoto.count({
    where: { uploadedById: teacher.data.userId, createdAt: { gte: startOfDay } },
  });

  if (uploadedToday + input.files.length > MAX_PHOTOS_PER_DAY) {
    return {
      ok: false,
      error: `You can upload ${MAX_PHOTOS_PER_DAY} photographs a day.`,
    };
  }

  const stored = await storeUploads(teacher.data.userId, decodeUploads(input.files));

  if (!stored.ok) {
    return { ok: false, error: stored.error };
  }

  const files = stored.data!;

  for (const file of files) {
    await prisma.galleryPhoto.create({
      data: {
        albumId: album.id,
        url: `/api/files/${file.id}`,
        caption: null,
        name: file.originalName,
        size: formatBytes(file.sizeBytes),
        // A photograph of a teacher waits for the admin.
        status: "PENDING",
        uploadedById: teacher.data.userId,
        fileId: file.id,
      },
    });
  }

  await writeAudit({
    actorId: teacher.data.userId,
    action: "Photos uploaded",
    entityType: "Gallery album",
    entityId: album.id,
    metadata: {
      album: album.title,
      count: files.length,
      names: files.map((file) => file.originalName),
    },
  });

  return { ok: true, data: { uploaded: files.length } };
}
