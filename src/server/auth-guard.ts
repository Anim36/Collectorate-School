import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/server/db";
import {
  ROLE_HOME,
  type SessionRole,
  type SessionUser,
} from "@/server/auth-types";

/**
 * The signed-in user, read from the database.
 *
 * The session is not trusted on its own: the row is read again on every
 * protected request and the session version is compared with it. A user who
 * has been deactivated, or whose password has been changed since the
 * session was issued, is refused straight away.
 */
export interface CurrentUser {
  /** The id of the user row. */
  id: string;
  /** The login id of the user row. */
  loginId: string;
  /** The name the shell shows. */
  name: string;
  /** The role, which decides the portal. */
  role: SessionRole;
  /** Whether the user still has to replace their temporary password. */
  mustChangePassword: boolean;
  /** The path of the user's photo, when there is one. */
  photoUrl: string | null;
  /** The alternative text for the photo. */
  photoAlt: string | null;
}

/**
 * The signed-in user, or null when there is nobody signed in.
 *
 * The row is re-read from the database, so a deactivated account or a
 * session that has been superseded is treated as signed out.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();

  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      loginId: true,
      name: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      sessionVersion: true,
      student: { select: { photoUrl: true } },
      teacher: { select: { photoUrl: true } },
    },
  });

  if (!user) return null;

  // A deactivated account keeps every record it owns, but it cannot sign in.
  if (!user.isActive) return null;

  // The session version moves whenever the password changes or the account
  // is deactivated or reset. A session made before that no longer matches.
  if (user.sessionVersion !== session.user.sessionVersion) return null;

  const photoUrl = user.student?.photoUrl ?? user.teacher?.photoUrl ?? null;

  return {
    id: user.id,
    loginId: user.loginId,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    photoUrl,
    photoAlt: photoUrl ? `Portrait of ${user.name}` : null,
  };
}

/**
 * The signed-in user, or a redirect to the sign-in page.
 *
 * A user whose account still has to replace its temporary password is sent
 * to the password page first.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  return user;
}

/**
 * The signed-in user of a given role, or a redirect.
 *
 * A user of the wrong role is sent to their own dashboard rather than to
 * the sign-in page, so a signed-in user is never bounced out of the site.
 */
export async function requireRole(role: SessionRole): Promise<CurrentUser> {
  const user = await requireUser();

  if (user.role !== role) {
    redirect(ROLE_HOME[user.role]);
  }

  return user;
}

/**
 * The claims the session carries, for the middleware.
 *
 * The middleware runs on the edge and cannot reach the database, so it only
 * reads the claims. The server-side guards are what actually re-check the
 * row.
 */
export function sessionClaims(session: {
  user?: Partial<SessionUser>;
} | null): SessionUser | null {
  if (!session?.user?.id || !session.user.role) return null;

  return {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name ?? "",
    mustChangePassword: Boolean(session.user.mustChangePassword),
    sessionVersion: session.user.sessionVersion ?? 0,
  };
}
