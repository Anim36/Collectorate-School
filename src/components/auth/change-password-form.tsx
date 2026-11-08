"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AccountGuidance } from "@/components/auth/account-guidance";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/\d/, "Include a number in your password"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Mock credential accepted by the demo password update check. */
const MOCK_CURRENT_PASSWORD = "password123";

/**
 * Password rules shown under the new-password field.
 * Figma node 2:3323 is a 57px block, i.e. three 19px lines of 13px copy.
 */
const PASSWORD_RULES = [
  "✓ At least 12 characters",
  "✓ Include a number and a symbol",
  "✓ No spaces or personal details",
] as const;

export function ChangePasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(false);
    setSaved(false);
    setSubmitting(true);

    // Simulate the password update round trip.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitting(false);

    if (values.currentPassword !== MOCK_CURRENT_PASSWORD) {
      setFormError(true);
      return;
    }

    setSaved(true);
    toast({
      title: "Password updated",
      description: "Use your new password the next time you sign in.",
    });
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
        Set a new password
      </h1>
      <p
        data-auth="subheading"
        className="mt-6 text-body leading-[1.45] text-muted"
      >
        For your security, change your temporary password before continuing.
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 flex w-full flex-col"
      >
        <div data-auth="current-password">
          <PasswordField
            label="Current password"
            placeholder="Enter your current password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
        </div>

        <div className="mt-6" data-auth="new-password">
          <PasswordField
            label="New password"
            placeholder="Enter a new password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
        </div>

        <div className="mt-6" data-auth="confirm-password">
          <PasswordField
            label="Confirm password"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

        <ul
          data-auth="strength"
          className="mt-6 flex flex-col text-caption leading-[1.45] text-muted"
        >
          {PASSWORD_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        {formError ? (
          <div
            role="alert"
            className="mt-6 flex w-full flex-col rounded-[12px] border border-danger bg-surface p-4"
          >
            <p className="text-body font-semibold leading-[1.45] text-danger">
              Unable to update password
            </p>
            <p className="mt-1 text-caption leading-[1.45] text-muted">
              Your current password is incorrect. Please check it and try again.
            </p>
          </div>
        ) : null}

        {saved ? (
          <div
            role="status"
            className="mt-6 flex w-full flex-col rounded-[12px] border border-success bg-surface p-4"
          >
            <p className="text-body font-semibold leading-[1.45] text-success">
              Password updated
            </p>
            <p className="mt-1 text-caption leading-[1.45] text-muted">
              Use your new password the next time you sign in.
            </p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={submitting}
          data-auth="button"
          className="mt-6 w-fit px-6 py-3"
        >
          {submitting ? "Updating…" : "Update password"}
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
