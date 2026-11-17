import type { NextAuthConfig } from "next-auth";

import { SESSION_MAX_AGE } from "@/server/auth-types";

/**
 * The Auth.js configuration the middleware loads.
 *
 * This file must stay free of anything that needs the Node runtime — no
 * Prisma, no bcrypt — because the middleware runs on the edge. The
 * credentials provider itself lives in `auth.ts`, which the middleware never
 * imports.
 *
 * The `jwt` callback is edge-safe too, so it cannot read the row itself.
 * `auth.ts` overrides it with the version that can, and that is the one the
 * server uses.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    // The session lives in a signed cookie, so the server never has to keep
    // a session store.
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  trustHost: true,
  /**
   * The session cookie is `httpOnly` and `sameSite=lax` by Auth.js default.
   * The `Secure` flag is added only when the site is served over HTTPS, which
   * is Auth.js's own rule; pinning it on in production makes the intent
   * explicit and stops a production deploy on plain HTTP from issuing a
   * cookie a network can read.
   */
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [],
  callbacks: {
    /**
     * The session is built from the token.
     *
     * Only the fields listed in `SessionUser` are copied across, so the
     * password hash and the rest of the user row never reach the cookie.
     *
     * The portal the user belongs to is recorded on the token here, because
     * the sign-in callback runs before the token exists.
     *
     * The "update" trigger is the session refresh that follows a password
     * change. The claims have to be read from the row again, because the
     * password change clears the "must change" flag and moves the session
     * version on; a token that kept the old claims would send the user back
     * to the password page. The edge-safe version of this callback cannot
     * reach the database, so `auth.ts` replaces it with one that can.
     */
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.name = user.name ?? "";
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
      }

      return token;
    },
    session({ session, token }) {
      if (token.userId && token.role) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.name = token.name ?? "";
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.sessionVersion = token.sessionVersion ?? 0;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
