import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { deleteFile } from "@/server/storage";

/**
 * The acceptance checks of step B3B, over HTTP.
 *
 * They drive the file route and the server actions of the four admin pages,
 * so the session, the role check and the headers the route sends are all
 * covered.
 *
 * Usage: npx tsx scripts/qa/check-admin-11b-http.ts [baseUrl]
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3111";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = "B3B-Http-Pass-2026!";
const PREFIX = "b3b-http";

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

/** The ids the checks work with. */
const IDS = {
  admin: `${PREFIX}-admin`,
  teacher: `${PREFIX}-teacher`,
  student: `${PREFIX}-student`,
};

/** A cookie jar, so a session can be carried between requests. */
class CookieJar {
  private cookies = new Map<string, string>();

  store(setCookie: string[] | undefined): void {
    for (const entry of setCookie ?? []) {
      const [pair] = entry.split(";");
      const index = pair.indexOf("=");

      if (index < 0) continue;

      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();

      if (value === "") {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header(): string {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

/** Makes a request and follows the cookies. */
async function request(
  path: string,
  options: { method?: string; jar?: CookieJar; body?: string } = {},
): Promise<{ status: number; location: string | null; body: string }> {
  const jar = options.jar;
  const headers: Record<string, string> = {};

  if (jar && jar.header()) headers["cookie"] = jar.header();
  if (options.body) headers["content-type"] = "application/x-www-form-urlencoded";

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body,
    redirect: "manual",
  });

  jar?.store(response.headers.getSetCookie());

  return {
    status: response.status,
    location: response.headers.get("location"),
    body: await response.text(),
  };
}

/** Fetches a file and reports what the server answered. */
async function fetchFile(
  fileId: string,
  jar?: CookieJar | null,
): Promise<{ status: number; type: string | null; nosniff: string | null }> {
  const headers: Record<string, string> = {};

  if (jar && jar.header()) headers["cookie"] = jar.header();

  const response = await fetch(`${BASE_URL}/api/files/${fileId}`, {
    headers,
    redirect: "manual",
  });

  return {
    status: response.status,
    type: response.headers.get("content-type"),
    nosniff: response.headers.get("x-content-type-options"),
  };
}

/** Signs in and keeps the session cookie. */
async function signIn(
  loginId: string,
  role: string,
): Promise<CookieJar | null> {
  const jar = new CookieJar();

  const csrf = await request("/api/auth/csrf", { jar });
  const token = /"csrfToken":"([^"]+)"/.exec(csrf.body)?.[1] ?? "";

  if (!token) return null;

  await request("/api/auth/callback/credentials", {
    method: "POST",
    jar,
    body: new URLSearchParams({
      csrfToken: token,
      loginId,
      password: PASSWORD,
      role,
      callbackUrl: `${BASE_URL}/`,
      json: "true",
    }).toString(),
  });

  return jar;
}

/**
 * Calls a server action over the action endpoint.
 *
 * The action id is read from the built client chunks, because it changes with
 * every build.
 */
async function callAction(
  jar: CookieJar | null | undefined,
  actionName: string,
  args: unknown[],
): Promise<{ status: number; body: string }> {
  const actionId = await findActionId(actionName);

  if (!actionId) return { status: 0, body: "no action id" };

  const form = new FormData();
  form.append("0", JSON.stringify(args));

  const headers: Record<string, string> = { "next-action": actionId };

  if (jar && jar.header()) headers["cookie"] = jar.header();

  const response = await fetch(`${BASE_URL}/admin/users`, {
    method: "POST",
    headers,
    body: form,
    redirect: "manual",
  });

  return { status: response.status, body: await response.text() };
}

/** The id of a server action, read from the built client chunks. */
async function findActionId(name: string): Promise<string | null> {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  let found: string | null = null;

  const walk = (dir: string): void => {
    if (found) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".js")) {
        const source = readFileSync(full, "utf8");

        // The id has to belong to the action that is asked for: a chunk holds
        // several of them, and the first one is not the right one.
        const match = new RegExp(
          `createServerReference\\)\\("([a-f0-9]+)"[^)]*,"${name}"\\)`,
        ).exec(source);

        if (match) found = match[1];
      }
    }
  };

  walk(".next/static/chunks");

  return found;
}

/** Removes every row the checks wrote. */
async function cleanup(): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { loginIdNormalized: { startsWith: PREFIX } },
        { email: { startsWith: PREFIX } },
      ],
    },
    select: { id: true },
  });

  const userIds = users.map((user) => user.id);

  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.auditLog.deleteMany({
    where: { entityId: { startsWith: PREFIX } },
  });
  await prisma.student.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.teacher.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  // The files and the rows the checks wrote.
  const files = await prisma.storedFile.findMany({
    select: { id: true, storageKey: true },
  });

  await prisma.galleryPhoto.deleteMany({
    where: { fileId: { in: files.map((file) => file.id) } },
  });

  await prisma.noticeAttachment.deleteMany({
    where: { fileId: { in: files.map((file) => file.id) } },
  });

  // The bytes are taken off the disk as well, so the storage does not keep
  // files that no row points at any more.
  for (const file of files) {
    await deleteFile(file.storageKey);
  }

  await prisma.storedFile.deleteMany({});

  await prisma.galleryPhoto.deleteMany({
    where: { name: { startsWith: PREFIX } },
  });

  await prisma.galleryPhoto.deleteMany({
    where: { name: { startsWith: "B3B http" } },
  });

  await prisma.notice.deleteMany({
    where: { id: { startsWith: PREFIX } },
  });

  await prisma.notice.deleteMany({
    where: { id: { startsWith: "b3b-http" } },
  });

  await prisma.galleryAlbum.deleteMany({
    where: { title: { startsWith: "B3B http" } },
  });
}

/**
 * Creates the accounts the checks sign in as.
 */
async function createAccounts(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const accounts = [
    { id: IDS.admin, role: "ADMIN" as const, name: "B3B Http Admin" },
    { id: IDS.teacher, role: "TEACHER" as const, name: "B3B Http Teacher" },
    { id: IDS.student, role: "STUDENT" as const, name: "B3B Http Student" },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { loginIdNormalized: account.id },
      update: { passwordHash, role: account.role },
      create: {
        id: account.id,
        loginId: account.id,
        loginIdNormalized: account.id,
        name: account.name,
        email: `${account.id}@example.com`,
        passwordHash,
        role: account.role,
        isActive: true,
        mustChangePassword: false,
      },
    });
  }
}

async function main(): Promise<void> {
  await cleanup();
  await createAccounts();

  const adminJar = await signIn(IDS.admin, "ADMIN");
  const teacherJar = await signIn(IDS.teacher, "TEACHER");
  const studentJar = await signIn(IDS.student, "STUDENT");

  /* ----------------------------------------- 4. the server actions ------- */

  // Every action of the four pages is refused for a visitor who is not an
  // admin, and it writes nothing.
  const actions: { name: string; args: unknown[] }[] = [
    {
      name: "listNoticesAction",
      args: [{ query: "b3b-http", page: 0, pageSize: 5 }],
    },
    {
      name: "getNoticeAction",
      args: ["notice-b3b-http-draft"],
    },
    {
      name: "saveNoticeAction",
      args: [
        {
          id: `${PREFIX}-notice`,
          title: "B3B http notice",
          body: "<p>Body.</p>",
          category: "Academic",
          audiences: ["PUBLIC"],
        },
      ],
    },
    {
      name: "publishNoticeAction",
      args: ["notice-b3b-http-draft"],
    },
    {
      name: "unpublishNoticeAction",
      args: ["notice-b3b-http-draft"],
    },
    {
      name: "deleteNoticeAction",
      args: ["notice-b3b-http-draft"],
    },
    {
      name: "attachFilesAction",
      args: [
        {
          noticeId: "notice-b3b-http-draft",
          files: [{ name: "b3b-http.png", base64: "" }],
        },
      ],
    },
    {
      name: "removeAttachmentAction",
      args: ["b3b-http-attachment"],
    },
    {
      name: "listAlbumsAction",
      args: [{ query: "b3b-http" }],
    },
    {
      name: "listPendingPhotosAction",
      args: [],
    },
    {
      name: "saveAlbumAction",
      args: [{ title: "B3B http album", category: "Academic" }],
    },
    {
      name: "deleteAlbumAction",
      args: ["album-b3b-http"],
    },
    {
      name: "approvePhotoAction",
      args: ["photo-b3b-http"],
    },
    {
      name: "rejectPhotoAction",
      args: ["photo-b3b-http", "Not good enough"],
    },
    {
      name: "deletePhotoAction",
      args: ["photo-b3b-http"],
    },
    {
      name: "uploadPhotosAction",
      args: [
        {
          albumId: "album-b3b-http",
          files: [{ name: "b3b-http.png", base64: "" }],
        },
      ],
    },
    {
      name: "listRoutineClassesAction",
      args: [],
    },
    {
      name: "getRoutineAction",
      args: ["class-9"],
    },
    {
      name: "saveRoutineAction",
      args: [
        {
          classId: "class-9",
          effectiveFrom: "2026-12-01",
          periods: [{ day: 0, period: 1, subjectId: "subject-bangla" }],
        },
      ],
    },
    {
      name: "publishRoutineAction",
      args: ["class-9"],
    },
    {
      name: "listCalendarEventsAction",
      args: [{ page: 0, pageSize: 5 }],
    },
    {
      name: "saveCalendarEventAction",
      args: [
        {
          id: `${PREFIX}-event`,
          title: "B3B http event",
          date: "2026-11-20",
          type: "EVENT",
        },
      ],
    },
    {
      name: "deleteCalendarEventAction",
      args: ["calendar-b3b-http"],
    },
  ];

  const visitors: { name: string; jar: CookieJar | undefined }[] = [
    { name: "anonymous", jar: undefined },
    { name: "student", jar: studentJar ?? undefined },
    { name: "teacher", jar: teacherJar ?? undefined },
  ];

  for (const visitor of visitors) {
    const refused: string[] = [];
    const accepted: string[] = [];

    for (const action of actions) {
      const result = await callAction(visitor.jar, action.name, action.args);

      if (result.status === 200 && result.body.includes('"ok":true')) {
        accepted.push(action.name);
      } else {
        refused.push(action.name);
      }
    }

    check(
      `a ${visitor.name} is refused on every B3B server action`,
      accepted.length === 0,
      accepted.length === 0
        ? `${refused.length} action(s) refused`
        : `accepted: ${accepted.join(", ")}`,
    );
  }

  // Nothing was written by the refused actions.
  const notices = await prisma.notice.count({
    where: { id: { startsWith: PREFIX } },
  });

  const albums = await prisma.galleryAlbum.count({
    where: { title: { startsWith: "B3B http" } },
  });

  const events = await prisma.calendarEvent.count({
    where: { id: { startsWith: PREFIX } },
  });

  const photos = await prisma.galleryPhoto.count({
    where: { name: { startsWith: PREFIX } },
  });

  check(
    "a refused action writes nothing",
    notices === 0 && albums === 0 && events === 0 && photos === 0,
    `${notices} notice(s), ${albums} album(s), ${events} event(s), ${photos} photo(s)`,
  );

  // An admin may run them.
  const allowed = await callAction(adminJar, "listNoticesAction", [
    { query: "b3b-http", page: 0, pageSize: 5 },
  ]);

  check(
    "an admin may run a B3B server action",
    allowed.status === 200,
    `${allowed.status}`,
  );

  /* ------------------------------------------- 3. the file route --------- */

  // The rows the route serves are made by hand, so every state is covered.
  const files = await prisma.storedFile.findMany({ select: { id: true } });

  check(
    "the storage holds no file rows",
    files.length === 0,
    `${files.length} file(s)`,
  );

  // A stored file, a photo in every state and a notice in every state.
  const { saveFile } = await import("@/server/storage");

  const PNG_BYTES = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  const written = await saveFile({
    bytes: PNG_BYTES,
    originalName: `${PREFIX}.png`,
  });

  if (!written.ok) {
    console.log(`FAIL  the check file could not be written — ${written.error}`);
    process.exit(1);
  }

  const stored = await prisma.storedFile.create({
    data: {
      storageKey: written.data.storageKey,
      originalName: written.data.originalName,
      mimeType: written.data.mimeType,
      sizeBytes: written.data.sizeBytes,
      uploadedById: IDS.admin,
    },
    select: { id: true },
  });

  const fileId = stored.id;

  const album = await prisma.galleryAlbum.create({
    data: {
      title: "B3B http album",
      slug: `${PREFIX}-album`,
      category: "Academic",
      visibility: "PUBLIC",
    },
    select: { id: true },
  });

  // An upload without any bytes is refused as empty, over the action
  // endpoint, and it writes nothing.
  const emptyUpload = await callAction(adminJar, "uploadPhotosAction", [
    {
      albumId: album.id,
      files: [{ name: "b3b-http-empty.png", base64: "" }],
    },
  ]);

  check(
    "an upload without bytes is refused as empty",
    emptyUpload.status === 200 &&
      emptyUpload.body.includes('"ok":false') &&
      emptyUpload.body.includes('"reason":"EMPTY"'),
    `${emptyUpload.status} ${emptyUpload.body.slice(0, 160)}`,
  );

  const emptyFiles = await prisma.storedFile.count({
    where: { originalName: "b3b-http-empty.png" },
  });

  check(
    "a refused empty upload writes no file row",
    emptyFiles === 0,
    `${emptyFiles} file(s)`,
  );

  const pendingPhoto = await prisma.galleryPhoto.create({
    data: {
      albumId: album.id,
      url: `/api/files/${fileId}`,
      name: `${PREFIX}-pending.png`,
      status: "PENDING",
      fileId,
      uploadedById: IDS.admin,
    },
    select: { id: true },
  });

  const rejectedPhoto = await prisma.galleryPhoto.create({
    data: {
      albumId: album.id,
      url: `/api/files/${fileId}`,
      name: `${PREFIX}-rejected.png`,
      status: "REJECTED",
      fileId,
      uploadedById: IDS.admin,
    },
    select: { id: true },
  });

  const approvedPhoto = await prisma.galleryPhoto.create({
    data: {
      albumId: album.id,
      url: `/api/files/${fileId}`,
      name: `${PREFIX}-approved.png`,
      status: "APPROVED",
      fileId,
      uploadedById: IDS.admin,
    },
    select: { id: true },
  });

  const draftNotice = await prisma.notice.create({
    data: {
      id: `${PREFIX}-draft`,
      title: "B3B http draft",
      body: "<p>Draft.</p>",
      category: "Academic",
      audience: "PUBLIC",
      audiences: ["PUBLIC"],
      status: "DRAFT",
    },
    select: { id: true },
  });

  const publicNotice = await prisma.notice.create({
    data: {
      id: `${PREFIX}-public`,
      title: "B3B http public",
      body: "<p>Public.</p>",
      category: "Academic",
      audience: "PUBLIC",
      audiences: ["PUBLIC"],
      status: "PUBLISHED",
    },
    select: { id: true },
  });

  const studentNotice = await prisma.notice.create({
    data: {
      id: `${PREFIX}-students`,
      title: "B3B http students",
      body: "<p>Students.</p>",
      category: "Academic",
      audience: "STUDENTS",
      audiences: ["STUDENTS"],
      status: "PUBLISHED",
    },
    select: { id: true },
  });

  const draftAttachment = await prisma.noticeAttachment.create({
    data: {
      noticeId: draftNotice.id,
      name: `${PREFIX}-draft.png`,
      fileId,
    },
    select: { id: true },
  });

  const publicAttachment = await prisma.noticeAttachment.create({
    data: {
      noticeId: publicNotice.id,
      name: `${PREFIX}-public.png`,
      fileId,
    },
    select: { id: true },
  });

  const studentAttachment = await prisma.noticeAttachment.create({
    data: {
      noticeId: studentNotice.id,
      name: `${PREFIX}-students.png`,
      fileId,
    },
    select: { id: true },
  });

  // The file of the photo is a different one, so every row points at a file
  // of its own.
  const separate = async (name: string) => {
    const outcome = await saveFile({
      bytes: PNG_BYTES,
      originalName: name,
    });

    if (!outcome.ok) return null;

    const row = await prisma.storedFile.create({
      data: {
        storageKey: outcome.data.storageKey,
        originalName: outcome.data.originalName,
        mimeType: outcome.data.mimeType,
        sizeBytes: outcome.data.sizeBytes,
        uploadedById: IDS.admin,
      },
      select: { id: true },
    });

    return row.id;
  };

  const pendingFileId = await separate(`${PREFIX}-pending.png`);
  const rejectedFileId = await separate(`${PREFIX}-rejected.png`);
  const approvedFileId = await separate(`${PREFIX}-approved.png`);
  const draftFileId = await separate(`${PREFIX}-draft.png`);
  const publicFileId = await separate(`${PREFIX}-public.png`);
  const studentFileId = await separate(`${PREFIX}-students.png`);

  await prisma.galleryPhoto.update({
    where: { id: pendingPhoto.id },
    data: { fileId: pendingFileId },
  });

  await prisma.galleryPhoto.update({
    where: { id: rejectedPhoto.id },
    data: { fileId: rejectedFileId },
  });

  await prisma.galleryPhoto.update({
    where: { id: approvedPhoto.id },
    data: { fileId: approvedFileId },
  });

  await prisma.noticeAttachment.update({
    where: { id: draftAttachment.id },
    data: { fileId: draftFileId },
  });

  await prisma.noticeAttachment.update({
    where: { id: publicAttachment.id },
    data: { fileId: publicFileId },
  });

  await prisma.noticeAttachment.update({
    where: { id: studentAttachment.id },
    data: { fileId: studentFileId },
  });

  // A photo that waits for the admin is not served to anybody but an admin.
  for (const visitor of visitors) {
    const result = await fetchFile(pendingFileId!, visitor.jar);

    check(
      `a pending photo is not served to a ${visitor.name}`,
      result.status === 404,
      `${result.status}`,
    );
  }

  const pendingForAdmin = await fetchFile(pendingFileId!, adminJar);

  check(
    "a pending photo is served to an admin",
    pendingForAdmin.status === 200,
    `${pendingForAdmin.status}`,
  );

  // A photo that was sent back is not served either.
  for (const visitor of visitors) {
    const result = await fetchFile(rejectedFileId!, visitor.jar);

    check(
      `a rejected photo is not served to a ${visitor.name}`,
      result.status === 404,
      `${result.status}`,
    );
  }

  const rejectedForAdmin = await fetchFile(rejectedFileId!, adminJar);

  check(
    "a rejected photo is served to an admin",
    rejectedForAdmin.status === 200,
    `${rejectedForAdmin.status}`,
  );

  // An approved photo of a public album is served to everybody.
  for (const visitor of visitors) {
    const result = await fetchFile(approvedFileId!, visitor.jar);

    check(
      `an approved photo of a public album is served to a ${visitor.name}`,
      result.status === 200,
      `${result.status}`,
    );
  }

  // The attachment of a draft notice is not served to anybody but an admin.
  for (const visitor of visitors) {
    const result = await fetchFile(draftFileId!, visitor.jar);

    check(
      `the attachment of a draft notice is not served to a ${visitor.name}`,
      result.status === 404,
      `${result.status}`,
    );
  }

  const draftForAdmin = await fetchFile(draftFileId!, adminJar);

  check(
    "the attachment of a draft notice is served to an admin",
    draftForAdmin.status === 200,
    `${draftForAdmin.status}`,
  );

  // The attachment of a published notice that is addressed to the public is
  // served to everybody.
  for (const visitor of visitors) {
    const result = await fetchFile(publicFileId!, visitor.jar);

    check(
      `the attachment of a public notice is served to a ${visitor.name}`,
      result.status === 200,
      `${result.status}`,
    );
  }

  // The attachment of a notice that is addressed to the students is served to
  // a student and to an admin, and not to a teacher.
  const studentForStudent = await fetchFile(studentFileId!, studentJar);

  check(
    "the attachment of a notice for the students is served to a student",
    studentForStudent.status === 200,
    `${studentForStudent.status}`,
  );

  const studentForTeacher = await fetchFile(studentFileId!, teacherJar);

  check(
    "the attachment of a notice for the students is not served to a teacher",
    studentForTeacher.status === 404,
    `${studentForTeacher.status}`,
  );

  const studentForAnonymous = await fetchFile(studentFileId!);

  check(
    "the attachment of a notice for the students is not served to an anonymous visitor",
    studentForAnonymous.status === 404,
    `${studentForAnonymous.status}`,
  );

  // The response carries the header that stops the browser from guessing.
  const served = await fetchFile(approvedFileId!, adminJar);

  check(
    "the response carries X-Content-Type-Options: nosniff",
    served.nosniff === "nosniff",
    `${served.nosniff}`,
  );

  check(
    "the response carries the type that was verified from the bytes",
    served.type === "image/png",
    `${served.type}`,
  );

  // A file that does not exist is refused.
  const missing = await fetchFile("does-not-exist", adminJar);

  check("a file that does not exist is refused", missing.status === 404);

  await cleanup();

  await prisma.$disconnect();

  const failed = results.filter((result) => !result.pass);

  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed.`,
  );

  if (failed.length > 0) process.exit(1);
}

void main();
