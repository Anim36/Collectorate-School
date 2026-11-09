"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AccountGuidance } from "@/components/auth/account-guidance";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { changePasswordAction } from "@/app/(auth)/actions";
import {
  PASSWORD_RULES,
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/lib/password-schema";

/** How long the success state stays on screen before the dashboard opens. */
const REDIRECT_DELAY_MS = 1500;

export function ChangePasswordForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");

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

    const formData = new FormData();
    formData.set("currentPassword", values.currentPassword);
    formData.set("newPassword", values.newPassword);
    formData.set("confirmPassword", values.confirmPassword);

    const result = await changePasswordAction(null, formData);

    setSubmitting(false);

    if (!result.ok) {
      setFormError(true);
      return;
    }

    setSaved(true);
    toast({
      title: "Password updated",
      description: "Taking you to your dashboard.",
    });

    // The dashboard of the role the account holds is opened after a moment,
    // so the success state is read before the page moves on.
    const target = result.redirectTo;

    if (target) {
      setTimeout(() => {
        router.push(target);
        router.refresh();
      }, REDIRECT_DELAY_MS);
    }
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
            {...register("newPassword", {
              onChange: (event) => setNewPassword(event.target.value),
            })}
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

        {/* The checklist is written from the same rules the form validates
            with, so it can never promise more than the form accepts. */}
        <ul
          data-auth="strength"
          className="mt-6 flex flex-col text-caption leading-[1.45] text-muted"
        >
          {PASSWORD_RULES.map((rule) => (
            <li key={rule.label}>
              {rule.met(newPassword) ? "✓" : "○"} {rule.label}
            </li>
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
              Password updated. Taking you to your dashboard.
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
