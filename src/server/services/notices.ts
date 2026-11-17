import { prisma } from "@/server/db";
import { htmlToText, sanitizeNoticeHtml } from "@/server/sanitize";
import {
  listNoticesSchema,
  saveNoticeSchema,
  type ListNoticesInput,
  type SaveNoticeInput,
  type ServiceResult,
} from "@/server/services/admin-11b-schemas";
import { writeAudit } from "@/server/services/audit";
import {
  decodeUploads,
  formatBytes,
  formatLabel,
  removeStoredFile,
  storeUploads,
} from "@/server/services/files";
import type {
  AdminNoticeList as NoticeList,
  AdminNoticeRow as NoticeRow,
} from "@/types/admin-11b";

/**
 * The notices of the school.
 *
 * Every read and every write goes through the service, so the page never
 * touches the database itself and the rules hold in one place.
 */

/**
 * The notices of the school, filtered and counted by the database.
 *
 * The search runs on the server, over the title and the body, and the count is
 * the number of notices that really match the filters.
 */
export async function listNotices(
  raw: Partial<ListNoticesInput> = {},
): Promise<ServiceResult<NoticeList>> {
  const parsed = listNoticesSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: "Those filters are not valid" };
  }

  const { query, category, audience, status, page, pageSize } = parsed.data;

  const where: Record<string, unknown> = {};

  if (category !== "ALL") where["category"] = category;
  if (status !== "ALL") where["status"] = status;

  // A notice can be addressed to more than one group, so the audience filter
  // looks at the list of audiences and not only at the first one.
  if (audience !== "ALL") {
    where["audiences"] = { has: audience };
  }

  const needle = query ?? "";

  if (needle !== "") {
    where["OR"] = [
      { title: { contains: needle, mode: "insensitive" } },
      { body: { contains: needle, mode: "insensitive" } },
    ];
  }

  const [total, notices] = await Promise.all([
    prisma.notice.count({ where }),
    prisma.notice.findMany({
      where,
      orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }],
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        publishedOn: true,
        body: true,
        audiences: true,
        attachments: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            size: true,
            fileId: true,
          },
        },
      },
    }),
  ]);

  const rows: NoticeRow[] = notices.map((notice) => ({
    id: notice.id,
    title: notice.title,
    category: notice.category,
    audiences: notice.audiences ?? [],
    status: notice.status === "PUBLISHED" ? "Published" : "Draft",
    publishedOn: notice.publishedOn
      ? notice.publishedOn.toISOString().slice(0, 10)
      : null,
    body: notice.body,
    attachments: notice.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      size: attachment.size ?? "",
      fileId: attachment.fileId,
    })),
  }));

  return {
    ok: true,
    data: {
      rows,
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/**
 * One notice, in full.
 */
export async function getNotice(
  noticeId: string,
): Promise<ServiceResult<NoticeRow>> {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      publishedOn: true,
      body: true,
      audiences: true,
      attachments: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, size: true, fileId: true },
      },
    },
  });

  if (!notice) {
    return { ok: false, error: "That notice does not exist" };
  }

  return {
    ok: true,
    data: {
      id: notice.id,
      title: notice.title,
      category: notice.category,
      audiences: notice.audiences ?? [],
      status: notice.status === "PUBLISHED" ? "Published" : "Draft",
      publishedOn: notice.publishedOn
        ? notice.publishedOn.toISOString().slice(0, 10)
        : null,
      body: notice.body,
      attachments: notice.attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        size: attachment.size ?? "",
        fileId: attachment.fileId,
      })),
    },
  };
}

/**
 * The dates a notice is published on, as the editor shows them.
 */
export function publishDateLabel(date: Date | null): string {
  if (!date) return "Not published yet";

  const label = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return `${label} · Now`;
}

/**
 * Creates a notice or edits an existing one.
 *
 * The body is cleaned on the server before it is written, so nothing that is
 * not on the allow list ever reaches the database.
 */
export async function saveNotice(
  actorId: string,
  raw: SaveNoticeInput,
): Promise<ServiceResult<{ id: string; title: string }>> {
  const parsed = saveNoticeSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That notice is not valid" };
  }

  const input = parsed.data;

  const body = sanitizeNoticeHtml(input.body);

  // A body that holds only markup is not a body.
  if (htmlToText(body) === "") {
    return { ok: false, error: "Write the notice before saving it" };
  }

  const audiences = Array.from(new Set(input.audiences));
  const publishedOn = input.publishedOn
    ? new Date(`${input.publishedOn}T00:00:00.000Z`)
    : null;

  try {
    // A notice that is saved under an id the database does not hold yet is
    // created under that id, so a caller that asks for an id gets it.
    const existing = input.id
      ? await prisma.notice.findUnique({
          where: { id: input.id },
          select: { id: true, status: true },
        })
      : null;

    if (existing) {
      await prisma.notice.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          body,
          category: input.category,
          audience: audiences[0],
          audiences,
          // The publish date of a notice that is already published is left
          // alone: editing the text of a notice does not move the day it was
          // published.
          ...(publishedOn ? { publishedOn } : {}),
        },
      });

      await writeAudit({
        actorId,
        action: "Notice edited",
        entityType: "Notice",
        entityId: existing.id,
        metadata: { title: input.title, category: input.category },
      });

      return { ok: true, data: { id: existing.id, title: input.title } };
    }

    const created = await prisma.notice.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        title: input.title,
        body,
        category: input.category,
        audience: audiences[0],
        audiences,
        status: "DRAFT",
        ...(publishedOn ? { publishedOn } : {}),
        authorId: actorId,
      },
      select: { id: true, title: true },
    });

    await writeAudit({
      actorId,
      action: "Notice created",
      entityType: "Notice",
      entityId: created.id,
      metadata: { title: created.title, category: input.category },
    });

    return { ok: true, data: created };
  } catch {
    // The database error is never shown to the admin.
    return { ok: false, error: "The notice could not be saved" };
  }
}

/**
 * Publishes a notice.
 *
 * The publish date is written when the notice goes out, and the notice
 * becomes visible to the audiences it was addressed to.
 */
export async function publishNotice(
  actorId: string,
  noticeId: string,
): Promise<ServiceResult<{ id: string; publishedOn: string }>> {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: { id: true, title: true, publishedOn: true },
  });

  if (!notice) {
    return { ok: false, error: "That notice does not exist" };
  }

  const publishedOn = notice.publishedOn ?? new Date();

  await prisma.notice.update({
    where: { id: noticeId },
    data: { status: "PUBLISHED", publishedOn },
  });

  await writeAudit({
    actorId,
    action: "Notice published",
    entityType: "Notice",
    entityId: noticeId,
    metadata: { title: notice.title },
  });

  return {
    ok: true,
    data: { id: noticeId, publishedOn: publishedOn.toISOString().slice(0, 10) },
  };
}

/**
 * Takes a published notice back to a draft.
 */
export async function unpublishNotice(
  actorId: string,
  noticeId: string,
): Promise<ServiceResult<{ id: string }>> {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: { id: true, title: true },
  });

  if (!notice) {
    return { ok: false, error: "That notice does not exist" };
  }

  await prisma.notice.update({
    where: { id: noticeId },
    data: { status: "DRAFT" },
  });

  await writeAudit({
    actorId,
    action: "Notice unpublished",
    entityType: "Notice",
    entityId: noticeId,
    metadata: { title: notice.title },
  });

  return { ok: true, data: { id: noticeId } };
}

/**
 * Removes a notice.
 *
 * The deletion is hard: a notice that is removed is gone from the notice
 * board for good, and the audit row keeps the record that it happened.
 */
export async function deleteNotice(
  actorId: string,
  noticeId: string,
): Promise<ServiceResult<{ id: string }>> {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: {
      id: true,
      title: true,
      attachments: { select: { fileId: true } },
    },
  });

  if (!notice) {
    return { ok: false, error: "That notice does not exist" };
  }

  // The attachment rows go with the notice through the cascade, but the
  // stored files do not: the cascade sets the file id to null and nothing
  // would remove the bytes. The ids are read first, so the files can be taken
  // off the disk after the notice is gone.
  const fileIds = notice.attachments
    .map((attachment) => attachment.fileId)
    .filter((fileId): fileId is string => Boolean(fileId));

  try {
    await prisma.notice.delete({ where: { id: noticeId } });
  } catch {
    return { ok: false, error: "That notice could not be deleted" };
  }

  for (const fileId of fileIds) {
    await removeStoredFile(actorId, fileId);
  }

  await writeAudit({
    actorId,
    action: "Notice deleted",
    entityType: "Notice",
    entityId: noticeId,
    metadata: { title: notice.title },
  });

  return { ok: true, data: { id: noticeId } };
}

/**
 * Attaches uploaded files to a notice.
 *
 * The files are written to the storage first, so a file that is not one the
 * school accepts never reaches the database. Every file that is stored gets a
 * row of its own, and the notice keeps a row per attachment.
 */
export async function attachFiles(
  actorId: string,
  input: {
    noticeId: string;
    files: { name: string; base64: string }[];
  },
): Promise<ServiceResult<{ attached: number }>> {
  const notice = await prisma.notice.findUnique({
    where: { id: input.noticeId },
    select: { id: true, title: true },
  });

  if (!notice) {
    return { ok: false, error: "That notice does not exist" };
  }

  const stored = await storeUploads(actorId, decodeUploads(input.files));

  if (!stored.ok) return stored;

  const attachments = stored.data!;

  await prisma.noticeAttachment.createMany({
    data: attachments.map((file) => ({
      noticeId: input.noticeId,
      name: file.originalName,
      format: formatLabel(file.mimeType),
      size: formatBytes(file.sizeBytes),
      fileId: file.id,
    })),
  });

  await writeAudit({
    actorId,
    action: "Files attached to notice",
    entityType: "Notice",
    entityId: input.noticeId,
    metadata: {
      title: notice.title,
      count: attachments.length,
      names: attachments.map((file) => file.originalName),
    },
  });

  return { ok: true, data: { attached: attachments.length } };
}

/**
 * Removes an attachment from a notice.
 *
 * The file behind the attachment is removed with it, so the storage does not
 * keep files nobody can reach.
 */
export async function removeAttachment(
  actorId: string,
  attachmentId: string,
): Promise<ServiceResult<{ id: string }>> {
  const attachment = await prisma.noticeAttachment.findUnique({
    where: { id: attachmentId },
    select: { id: true, fileId: true, name: true, noticeId: true },
  });

  if (!attachment) {
    return { ok: false, error: "That attachment does not exist" };
  }

  await prisma.noticeAttachment.delete({ where: { id: attachmentId } });

  if (attachment.fileId) {
    await removeStoredFile(actorId, attachment.fileId);
  }

  await writeAudit({
    actorId,
    action: "Notice attachment removed",
    entityType: "Notice",
    entityId: attachment.noticeId,
    metadata: { name: attachment.name },
  });

  return { ok: true, data: { id: attachmentId } };
}
