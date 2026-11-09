"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { AccountGuidance } from "@/components/auth/account-guidance";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { loginAction } from "@/app/(auth)/actions";
import {
  ADMIN_ENTRY_COPY,
  STUDENT_ENTRY_COPY,
  TEACHER_ENTRY_COPY,
  buildLoginSchema,
  type LoginEntryCopy,
  type LoginRole,
} from "@/lib/login-schema";

/** The two tabs of the school sign-in page. */
const TABS = [
  { role: "STUDENT" as const, label: "Student", copy: STUDENT_ENTRY_COPY },
  { role: "TEACHER" as const, label: "Teacher", copy: TEACHER_ENTRY_COPY },
];

/** The values the sign-in form holds. */
type LoginValues = z.infer<ReturnType<typeof buildLoginSchema>>;

export interface LoginFormProps {
  /**
   * The entry point the page is for.
   *
   * "STUDENT" and "TEACHER" draw the tab row; "ADMIN" draws the admin page,
   * which has no tabs and always sends the admin role.
   */
  entry?: "STUDENT" | "TEACHER" | "ADMIN";
}

/**
 * The sign-in form.
 *
 * The label and the placeholder of the id field follow the tab, so the form
 * asks for the id the user was told to use. Switching the tab clears the
 * fields and the error, because the id that was typed belongs to the entry
 * point that has just been left.
 */
export function LoginForm({ entry }: LoginFormProps = {}) {
  const router = useRouter();

  // The admin page has no tabs, so it pins the role and the wording.
  const isAdmin = entry === "ADMIN";

  const [role, setRole] = useState<LoginRole>(
    isAdmin ? "ADMIN" : entry === "TEACHER" ? "TEACHER" : "STUDENT",
  );
  const [submitting, setSubmitting] = useState(false);
  const [signInError, setSignInError] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);

  const copy: LoginEntryCopy = isAdmin
    ? ADMIN_ENTRY_COPY
    : (TABS.find((tab) => tab.role === role)?.copy ?? STUDENT_ENTRY_COPY);

  // The resolver is built from the wording of the current tab, so the
  // messages under the field always name the entry point that is on screen.
  const resolver = useMemo(
    () => zodResolver(buildLoginSchema(copy)),
    [copy],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver,
    defaultValues: {
      role: isAdmin ? "ADMIN" : "STUDENT",
      identifier: "",
      password: "",
      remember: true,
    },
  });

  /**
   * Switches the tab.
   *
   * The fields are cleared, because the id that was typed belongs to the
   * entry point that is being left, and the error is cleared with them.
   */
  const changeRole = (next: LoginRole) => {
    setRole(next);
    reset({ role: next, identifier: "", password: "", remember: true });
    setSignInError(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSignInError(false);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("loginId", values.identifier.trim());
    formData.set("password", values.password);
    formData.set("role", values.role);

    const result = await loginAction(null, formData);

    setSubmitting(false);

    if (!result.ok) {
      setSignInError(true);
      return;
    }

    toast({
      title: "Signed in",
      description: `Welcome back to the ${values.role.toLowerCase()} portal.`,
    });

    router.push(result.redirectTo ?? `/${values.role.toLowerCase()}/dashboard`);
    router.refresh();
  });

  return (
    <div
      data-auth="form"
      className="flex w-full flex-col px-6 pb-6 pt-6 md:px-16 md:pb-16 md:pt-16 xl:px-24 xl:pb-24 xl:pt-24"
    >
      <Link
        href="/"
        data-auth="back"
        className="inline-flex items-center gap-1 text-caption leading-[1.45] text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Back to school website
      </Link>

      <h1
        data-auth="heading"
        className="mt-6 text-heading font-bold leading-[1.45] text-ink"
      >
        {isAdmin ? "Admin sign in." : "Welcome back."}
      </h1>
      <p
        data-auth="subheading"
        className="mt-6 text-body leading-[1.45] text-muted"
      >
        {isAdmin
          ? "Sign in with your administrator account."
          : "Sign in to your school account."}
      </p>

      {isAdmin ? null : (
        <Tabs
          value={role}
          onValueChange={(value) => changeRole(value as LoginRole)}
          className="mt-6"
          data-auth="tabs"
        >
          <TabsList className="h-[55px] w-full gap-0 bg-transparent p-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.role}
                value={tab.role}
                className={
                  "h-[39px] flex-1 rounded-[12px] border border-border bg-surface text-body font-semibold leading-[1.45] text-muted transition-colors data-[state=active]:border-primary data-[state=active]:bg-tint data-[state=active]:text-primary"
                }
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 flex w-full flex-col"
      >
        <input type="hidden" {...register("role")} value={role} />

        <AuthField
          data-auth="identifier"
          label={copy.label}
          placeholder={copy.placeholder}
          autoComplete="username"
          error={errors.identifier?.message}
          {...register("identifier")}
        />

        <div className="mt-6" data-auth="password">
          <PasswordField
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        <div
          data-auth="remember"
          className="mt-6 flex items-center justify-between gap-4"
        >
          <label className="flex items-center gap-2 text-caption leading-[1.45] text-ink">
            <input
              type="checkbox"
              className="size-4 rounded-[4px] border border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("remember")}
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setForgotPassword(true)}
            className="text-caption leading-[1.45] text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Forgot password?
          </button>
        </div>

        {signInError ? (
          <div
            role="alert"
            className="mt-6 flex w-full flex-col rounded-[12px] border border-danger bg-surface p-4"
          >
            <p className="text-body font-semibold leading-[1.45] text-danger">
              Unable to sign in
            </p>
            <p className="mt-1 text-caption leading-[1.45] text-muted">
              Your ID or password is incorrect. Please check your details and try
              again.
            </p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={submitting}
          data-auth="button"
          className="mt-6 w-fit px-6 py-3"
        >
          {submitting ? "Signing in…" : "Login"}
        </Button>

        {submitting ? (
          <p className="mt-6 text-caption leading-[1.45] text-muted">
            Connecting securely to your school account…
          </p>
        ) : null}

        {forgotPassword ? (
          <div
            role="status"
            data-auth="forgot-password"
            className="mt-6 flex w-full flex-col rounded-[12px] border border-border bg-surface p-4"
          >
            <p className="text-body font-semibold leading-[1.45] text-ink">
              Password resets are handled by the school
            </p>
            <p className="mt-1 text-caption leading-[1.45] text-muted">
              There is no self-service reset. Contact the school office and an
              admin will reset your password.
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <AccountGuidance />
        </div>

        <p
          data-auth="privacy"
          className="mt-6 text-caption leading-[1.45] text-muted"
        >
          Your information is private and secure.
        </p>
      </form>
    </div>
  );
}
