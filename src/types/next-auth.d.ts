import type { DefaultSession } from "next-auth";

import type { SessionRole } from "@/server/auth-types";

/**
 * Teaches Auth.js about the extra fields the session carries.
 *
 * Without this the `session.user.role` and the other fields would be typed as
 * unknown, and every reader would need a cast.
 *
 * The interfaces live in `@auth/core/types`, which `next-auth` re-exports,
 * so the augmentation has to be declared there.
 */
declare module "@auth/core/types" {
  interface Session {
    user: {
      /** The id of the user row. */
      id: string;
      /** The role, which decides the portal the shell shows. */
      role: SessionRole;
      /** The name the shell shows in the top bar. */
      name: string;
      /** Whether the user still has to replace their temporary password. */
      mustChangePassword: boolean;
      /** The version the session was issued against. */
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    /** The id of the user row. */
    id: string;
    /** The role, which decides the portal the shell shows. */
    role: SessionRole;
    /** The name the shell shows in the top bar. */
    name: string;
    /** Whether the user still has to replace their temporary password. */
    mustChangePassword: boolean;
    /** The version the session was issued against. */
    sessionVersion: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    /** The id of the user row. */
    userId?: string;
    /** The role, which decides the portal the shell shows. */
    role?: SessionRole;
    /** The name the shell shows in the top bar. */
    name?: string;
    /** Whether the user still has to replace their temporary password. */
    mustChangePassword?: boolean;
    /** The version the session was issued against. */
    sessionVersion?: number;
  }
}
