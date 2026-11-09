"use server";

import { AuthError } from "next-auth";

import { auth, signIn, signOut, unstable_update } from "@/auth";
import {
  GENERIC_AUTH_ERROR,
  ROLE_HOME,
  ROLE_SIGN_IN,
  type SessionRole,
} from "@/server/auth-types";
import { changePasswordSchema } from "@/lib/password-schema";
import { loginRoleSchema, type LoginRole } from "@/lib/login-schema";
import { recordLogout } from "@/server/services/auth";

/**
 * The result of a sign-in, returned to the form.
 *
 * The message is the same for every failure, so the form cannot be used to
 * work out which ids exist.
 */
export interface LoginActionResult {
  /** Whether the sign-in went through. */
  ok: boolean;
  /** The message to show, when it failed. */
  message: string;
  /** The dashboard to go to, when it succeeded. */
  redirectTo: string | null;
}

/**
 * Signs a user in.
 *
 * The entry point the user came from is sent with the form and is checked
 * against the account's real role: a student signs in from the student tab,
 * a teacher from the teacher tab and an admin from the admin sign-in page.
 */
export async function loginAction(
  _previous: LoginActionResult | null,
  formData: FormData,
): Promise<LoginActionResult> {
  const loginId = String(formData.get("loginId") ?? "");
  const password = String(formData.get("password") ?? "");

  // The role comes from the form, so it is validated here. An entry point
  // that is not one of the three is refused before anything else happens.
  const parsedRole = loginRoleSchema.safeParse(formData.get("role"));

  if (!parsedRole.success) {
    return {
      ok: false,
      message: GENERIC_AUTH_ERROR,
      redirectTo: null,
    };
  }

  const role: LoginRole = parsedRole.data;

  // The credentials are checked here rather than by the provider, so the
  // role of the account is known before the redirect is worked out. The
  // provider checks them again when it writes the session, and that second
  // check is the one that is audited, so one sign-in leaves one audit row.
  const { authenticateCredentials } = await import("@/server/services/auth");

  const result = await authenticateCredentials(
    { loginId, password, role },
    { auditSuccess: false },
  );

  if (!result.ok) {
    return {
      ok: false,
      message: GENERIC_AUTH_ERROR,
      redirectTo: null,
    };
  }

  const home = ROLE_HOME[result.role as SessionRole];

  try {
    await signIn("credentials", {
      loginId,
      password,
      role,
      redirectTo: home,
    });
  } catch (error) {
    // Auth.js throws to interrupt the request when the sign-in succeeds, so
    // the redirect is not a failure.
    if (error instanceof AuthError) {
      return {
        ok: false,
        message: GENERIC_AUTH_ERROR,
        redirectTo: null,
      };
    }

    throw error;
  }

  // `signIn` redirects on success, so this is only reached if the redirect
  // was suppressed.
  return { ok: true, message: "", redirectTo: home };
}

/**
 * The result of a password change, returned to the form.
 */
export interface ChangePasswordActionResult {
  /** Whether the password was changed. */
  ok: boolean;
  /** The message to show, when it failed. */
  message: string;
  /** The dashboard the user is sent to, when it worked. */
  redirectTo: string | null;
}

/**
 * Replaces the signed-in user's password.
 *
 * The current password is checked first, the new password has to follow the
 * rules and be different from the old one, and the session version is
 * bumped so every other session stops working.
 */
export async function changePasswordAction(
  _previous: ChangePasswordActionResult | null,
  formData: FormData,
): Promise<ChangePasswordActionResult> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "Your session has ended. Please sign in again.",
      redirectTo: null,
    };
  }

  // The same rules the form applies, so a request that skips the form is
  // held to the same standard.
  const parsed = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Those passwords do not match",
      redirectTo: null,
    };
  }

  const { checkAndChangePassword } = await import("@/server/services/auth");

  const result = await checkAndChangePassword(
    session.user.id,
    currentPassword,
    newPassword,
  );

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "locked"
          ? "Too many attempts. Please wait a few minutes and try again."
          : "Your current password is incorrect",
      redirectTo: null,
    };
  }

  // The session version moved, so the session that is open no longer matches
  // the row. The session is re-issued, so the user stays signed in on this
  // device while every other session stops working.
  //
  // Nothing about the new claims is taken from the browser: the callback
  // reads the flag and the version from the row again, so the session that
  // comes back carries what the database actually says.
  await unstable_update({
    user: {
      id: session.user.id,
    },
  });

  const role = session.user.role as SessionRole;

  return { ok: true, message: "", redirectTo: ROLE_HOME[role] };
}

/**
 * Signs the current user out.
 *
 * The audit row is written before the session is torn down, so the sign-out
 * is recorded even though the session is gone afterwards.
 *
 * An admin is sent to the admin sign-in page and everyone else to the
 * school sign-in page.
 */
export async function logoutAction(): Promise<void> {
  const session = await auth();

  let signInPage = "/login";

  if (session?.user?.id) {
    await recordLogout(session.user.id);

    signInPage = ROLE_SIGN_IN[session.user.role as SessionRole] ?? "/login";
  }

  await signOut({ redirectTo: signInPage });
}
