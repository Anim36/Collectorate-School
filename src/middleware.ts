import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import {
  ROLE_HOME,
  ROLE_SIGN_IN,
  type SessionRole,
} from "@/server/auth-types";

/**
 * The middleware.
 *
 * It runs on the edge, so it must not import anything that needs the Node
 * runtime — no Prisma, no bcrypt. It only reads the claims in the session
 * cookie; the server-side guards in `src/server/auth-guard.ts` are what
 * re-check the row in the database.
 */
const { auth } = NextAuth(authConfig);

/** The role each protected prefix belongs to. */
const PROTECTED_ROUTES: { prefix: string; role: SessionRole }[] = [
  { prefix: "/student", role: "STUDENT" },
  { prefix: "/teacher", role: "TEACHER" },
  { prefix: "/admin", role: "ADMIN" },
];

/**
 * The route the user belongs on for their role.
 */
function homeFor(role: SessionRole): string {
  return ROLE_HOME[role];
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  const isSignedIn = Boolean(session?.user?.id);
  const role = session?.user?.role as SessionRole | undefined;

  // A signed-in user has no business on a sign-in page.
  if (pathname === "/login" || pathname === "/admin/login") {
    if (!isSignedIn) return NextResponse.next();

    return NextResponse.redirect(
      new URL(role ? homeFor(role) : "/", request.url),
    );
  }

  const protectedRoute = PROTECTED_ROUTES.find(
    (route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );

  // The password page is for signed-in users only: it has to know whose
  // password it is changing.
  if (pathname === "/change-password") {
    if (!isSignedIn || !role) {
      const signIn = new URL("/login", request.url);
      signIn.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signIn);
    }

    return NextResponse.next();
  }

  if (!protectedRoute) return NextResponse.next();

  // Nobody signed in goes to the sign-in page of their own portal: an admin
  // has a page of their own, so the admin portal never shows the school
  // tabs.
  if (!isSignedIn || !role) {
    const signIn = new URL(ROLE_SIGN_IN[protectedRoute.role], request.url);

    // The page the user was heading for is remembered, so the sign-in form
    // can send them back to it afterwards.
    signIn.searchParams.set("callbackUrl", `${pathname}`);

    return NextResponse.redirect(signIn);
  }

  // A user of the wrong role goes to their own dashboard.
  if (role !== protectedRoute.role) {
    return NextResponse.redirect(new URL(homeFor(role), request.url));
  }

  // An account that still has to replace its temporary password can only
  // reach the password page.
  if (session?.user?.mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  return NextResponse.next();
});

export const config = {
  /**
   * The routes the middleware runs on.
   *
   * The public pages and the password page are left out, except for the
   * sign-in pages, which have to send a signed-in user away.
   *
   * The admin sign-in page is left out of the admin rule with a negative
   * look-ahead: it lives under /admin, but it is the page the admin rule
   * sends a visitor to, so matching it would send them back to it for ever.
   * The plain "/admin/:path*" pattern cannot be used, because Next.js
   * matches each entry on its own and a "!" pattern would drop the whole
   * admin rule.
   */
  matcher: [
    "/login",
    "/admin/login",
    "/change-password",
    "/student/:path*",
    "/teacher/:path*",
    "/admin",
    "/admin/:path((?!login(?:/|$)).*)",
  ],
};
