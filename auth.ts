import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";
import type { SessionRole } from "@/server/auth-types";
import { authenticateCredentials, loginSchema } from "@/server/services/auth";

/**
 * The full Auth.js configuration.
 *
 * The middleware imports `auth.config.ts`, which holds everything that can
 * run on the edge. This file adds the credentials provider, which reaches
 * the database, so it is only ever loaded on the server.
 */
export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update,
} = NextAuth({
  ...authConfig,
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
