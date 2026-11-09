import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fileVisibility, readStoredFile } from "@/server/services/files";

/**
 * The route that hands out an uploaded file.
 *
 * The files live outside the web root, so nothing is served until this route
 * decides that the visitor may have it:
 *
 * - an approved photograph of a public album is served to anybody,
 * - an attachment of a published notice is served to the audience the notice
 *   was addressed to,
 * - a photograph that is still waiting for the admin, and an attachment of a
 *   notice that is still a draft, are served to an admin only.
 *
 * The type that is sent back is the one that was verified from the bytes of
 * the file when it was uploaded, never the one the browser asked for.
 */

/** The response when a file may not be seen. */
function refuse(status: number): NextResponse {
  return new NextResponse(null, { status });
}

/** The type of the file, as the browser is told. */
function contentDisposition(type: string, name: string): string {
  const safeName = name.replace(/["\\]/g, "").trim() || "download";

  if (type === "application/pdf") {
    return `inline; filename="${safeName}"`;
  }

  return `inline; filename="${safeName}"`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!id || id.length > 64) {
    return refuse(404);
  }

  const visibility = await fileVisibility(id);

  if (!visibility) {
    return refuse(404);
  }

  if (visibility.kind === "admin-only") {
    // Only an admin may have a file that is not published yet.
    const session = await auth();

    if (session?.user?.role !== "ADMIN") {
      return refuse(404);
    }
  }

  if (visibility.kind === "audience") {
    const session = await auth();

    const role = session?.user?.role;

    const allowed =
      role === "ADMIN" ||
      (role === "TEACHER" && visibility.audiences.includes("TEACHERS")) ||
      (role === "STUDENT" && visibility.audiences.includes("STUDENTS"));

    if (!allowed) {
      return refuse(404);
    }
  }

  const file = await readStoredFile(id);

  if (!file) {
    return refuse(404);
  }

  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.bytes.length),
      "Content-Disposition": contentDisposition(file.mimeType, file.name),
      // The browser must not guess the type of the file.
      "X-Content-Type-Options": "nosniff",
      // The file is not shown inside the site.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
