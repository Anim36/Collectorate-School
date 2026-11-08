import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

/**
 * Student and teacher sign-in.
 * Figma "Auth / Login" (2:3194 desktop, 2:3228 tablet, 2:3262 mobile) with
 * the error state (2:3399) and the loading state (2:3509).
 */
export default function LoginPage() {
  return (
    <AuthShell>
      <main className="flex w-full flex-1 flex-col">
        <LoginForm />
      </main>
    </AuthShell>
  );
}
