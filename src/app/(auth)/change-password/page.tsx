import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Change password",
};

/**
 * Temporary password replacement.
 * Figma "Auth / Change password" (2:3295 desktop, 2:3330 tablet,
 * 2:3365 mobile).
 */
export default function ChangePasswordPage() {
  return (
    <AuthShell>
      <main className="flex w-full flex-1 flex-col">
        <ChangePasswordForm />
      </main>
    </AuthShell>
  );
}
