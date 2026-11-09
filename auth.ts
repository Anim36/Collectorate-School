import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";
import type { SessionRole } from "@/server/auth-types";
import {
  authenticateCredentials,
  loginSchema,
  readSessionClaims,
} from "@/server/services/auth";

/**
 * The full Auth.js configuration.
 *
 * The middleware imports `auth.config.ts`, which holds everything that can
 * run on the edge. This file adds the credentials provider and the session
 * refresh, which reach the database, so they are only ever loaded on the
 * server.
 */
export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update,
} = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * The session token is refreshed here.
     *
     * A password change clears the "must change" flag and moves the session
     * version on. The token still carries the old claims, so they are read
     * from the row again before the token is signed anew. The claims come
     * from the database and never from the payload the browser sent, so a
     * caller cannot talk its way into a session it has not earned.
     *
     * The middleware keeps the edge-safe version of this callback, which
     * only reads what is already on the token.
     */
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.name = user.name ?? "";
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;

        return token;
      }

      if (trigger === "update" && token.userId) {
        const claims = await readSessionClaims(token.userId);

        if (claims) {
          token.mustChangePassword = claims.mustChangePassword;
          token.sessionVersion = claims.sessionVersion;
        }
      }

      return token;
    },
  },
  providers: [
    Credentials({
      name: "School account",
      credentials: {
        loginId: { label: "ID", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      /**
       * Checks the sign-in.
       *
       * Every failure returns the same message, so the form cannot be used
       * to work out which ids exist.
       */
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);

        if (!parsed.success) return null;

        const result = await authenticateCredentials(parsed.data);

        if (!result.ok) return null;

        return {
          id: result.userId,
          role: result.role as SessionRole,
          name: result.name,
          mustChangePassword: result.mustChangePassword,
          sessionVersion: result.sessionVersion,
        };
      },
    }),
  ],
});
