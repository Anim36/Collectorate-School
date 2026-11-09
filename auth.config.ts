import type { NextAuthConfig } from "next-auth";

import { SESSION_MAX_AGE } from "@/server/auth-types";

/**
 * The Auth.js configuration the middleware loads.
 *
 * This file must stay free of anything that needs the Node runtime — no
 * Prisma, no bcrypt — because the middleware runs on the edge. The
 * credentials provider itself lives in `auth.ts`, which the middleware never
 * imports.
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
