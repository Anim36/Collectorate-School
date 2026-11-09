import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Administrator login",
};

/**
 * The administrator sign-in page.
 *
 * It is the same design as the school sign-in page, without the tab row: an
 * administrator always signs in here, and the form always sends the admin
 * role.
 *
 * It sits in its own route group, so it does not inherit the admin portal
 * layout: that layout guards the portal for a signed-in admin, which would
 * send a visitor who is not signed in back to this page for ever.
 *
 * The page is not linked from the public site, the navbar, the footer or the
 * school sign-in page.
 */
export default function AdminLoginPage() {
  return (
    <AuthShell>
      <main className="flex w-full flex-1 flex-col">
        <LoginForm entry="ADMIN" />
      </main>
    </AuthShell>
  );
}
