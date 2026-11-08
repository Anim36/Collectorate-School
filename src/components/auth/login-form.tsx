"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AccountGuidance } from "@/components/auth/account-guidance";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const loginSchema = z.object({
  role: z.enum(["student", "teacher"]),
  identifier: z
    .string()
    .min(1, "Enter your student ID or email address")
    .refine(
      (value) =>
        value.includes("@") || /^ST-\d{4}-\d{4}$/i.test(value.trim()),
      "Enter a valid student ID or email address",
    ),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Mock credentials accepted by the demo sign-in check. */
const MOCK_IDENTIFIER = "ST-2026-0042";
const MOCK_PASSWORD = "password123";

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [submitting, setSubmitting] = useState(false);
  const [signInError, setSignInError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      role: "student",
      identifier: "",
      password: "",
      remember: true,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSignInError(false);
    setSubmitting(true);

    // Simulate the authentication round trip.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const matches =
      values.identifier.trim() === MOCK_IDENTIFIER &&
      values.password === MOCK_PASSWORD;

    if (!matches) {
      setSubmitting(false);
      setSignInError(true);
      return;
    }

    toast({
      title: "Signed in",
      description: `Welcome back to the ${values.role} portal.`,
    });

    router.push(`/${values.role}/dashboard`);
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
        Welcome back.
      </h1>
      <p
        data-auth="subheading"
        className="mt-6 text-body leading-[1.45] text-muted"
      >
        Sign in to your school account.
      </p>

      <Tabs
        value={role}
        onValueChange={(value) => setRole(value as "student" | "teacher")}
        className="mt-6"
        data-auth="tabs"
      >
        <TabsList className="h-[55px] w-full gap-0 bg-transparent p-0">
          {(["student", "teacher"] as const).map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className={
                "h-[39px] flex-1 rounded-[12px] border border-border bg-surface text-body font-semibold leading-[1.45] text-muted transition-colors data-[state=active]:border-primary data-[state=active]:bg-tint data-[state=active]:text-primary"
              }
            >
              {value === "student" ? "Student" : "Teacher"}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 flex w-full flex-col"
      >
        <input type="hidden" {...register("role")} value={role} />

        <AuthField
          data-auth="identifier"
          label="Student ID / email"
          placeholder="e.g. ST-2026-0042"
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
          <Link
            href="/change-password"
            className="text-caption leading-[1.45] text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Forgot password?
          </Link>
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
