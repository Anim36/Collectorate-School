"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { AdminTextField } from "@/components/admin/admin-text-field";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_PASSWORD_MIN_LENGTH,
  adminClassSectionOptions,
  adminDepartments,
  type AdminUserRole,
} from "@/data/admin";

/**
 * The add-user form.
 *
 * Figma "Add User modal" (2:10623 desktop, 2:10790 tablet, 2:10944 mobile):
 * a 640px dialog with a 35px title, a 19px caption, five 76px field rows
 * 16px apart, a 19px note and the Create account and Cancel actions.
 *
 * The form is validated with react-hook-form and zod: the email must look
 * like an email address, the temporary password must hold at least twelve
 * characters and a student must be given a class and a section.
 */
const addUserSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the full name"),
    role: z.enum(["Student", "Teacher"]),
    classOrDept: z.string(),
    email: z
      .string()
      .trim()
      .min(1, "Enter an email address")
      .email("Enter a valid email address"),
    password: z
      .string()
      .min(
        ADMIN_PASSWORD_MIN_LENGTH,
        `Use at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`,
      ),
  })
  .superRefine((values, context) => {
    if (values.role === "Student" && values.classOrDept === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["classOrDept"],
        message: "Pick a class and a section",
      });
    }

    if (values.role === "Teacher" && values.classOrDept === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["classOrDept"],
        message: "Pick a department",
      });
    }
  });

type AddUserValues = z.infer<typeof addUserSchema>;

/** The values the form starts with. */
const defaultValues: AddUserValues = {
  name: "",
  role: "Student",
  classOrDept: "",
  email: "",
  password: "",
};

export interface AddUserModalProps {
  /** Called when the reader dismisses the modal. */
  onClose: () => void;
  /** Called with the new account once the form is valid. */
  onCreate: (values: {
    name: string;
    role: AdminUserRole;
    classOrDept: string;
    email: string;
  }) => void;
}

/**
 * The add-user dialog.
 *
 * The account is only recorded in memory — nothing is sent to a server.
 */
export function AddUserModal({ onClose, onCreate }: AddUserModalProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AddUserValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues,
    mode: "onChange",
  });

  // The role decides which options the class and section control offers.
  const role = useWatch({ control, name: "role" });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Add a school account"
        description="Accounts are created by the school admin."
        onClose={onClose}
        className="max-w-[640px]"
        footer={
          <>
            <Button type="submit" form="admin-add-user" className="h-[47px]">
              Create account
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-[49px]"
              onClick={onClose}
            >
              Cancel
            </Button>
          </>
        }
      >
        <form
          id="admin-add-user"
          onSubmit={handleSubmit((values) => {
            onCreate({
              name: values.name.trim(),
              role: values.role,
              classOrDept: values.classOrDept,
              email: values.email.trim(),
            });
          })}
          className="flex w-full flex-col gap-4"
          noValidate
        >
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <AdminTextField
                label="Full name"
                name="name"
                placeholder="Sadia Rahman"
                value={field.value}
                onValueChange={field.onChange}
                ref={field.ref}
                hint={errors.name?.message}
              />
            )}
          />

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Role
            </span>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    aria-label="Role"
                    className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
                  >
                    <SelectValue placeholder="Student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Class &amp; section
            </span>
            <Controller
              control={control}
              name="classOrDept"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    field.onBlur();
                  }}
                >
                  <SelectTrigger
                    aria-label="Class and section"
                    className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
                  >
                    <SelectValue
                      placeholder={
                        role === "Teacher" ? "Mathematics" : "Class 9 · A"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(role === "Teacher"
                      ? adminDepartments
                      : adminClassSectionOptions
                    ).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.classOrDept ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.classOrDept.message}
              </p>
            ) : null}
          </div>

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <AdminTextField
                label="Email"
                name="email"
                type="email"
                placeholder="sadia.rahman@example.com"
                value={field.value}
                onValueChange={field.onChange}
                ref={field.ref}
                hint={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <AdminTextField
                label="Temporary password"
                name="password"
                type="password"
                placeholder="School@2026!Change"
                value={field.value}
                onValueChange={field.onChange}
                ref={field.ref}
                hint={errors.password?.message}
              />
            )}
          />

          <p className="text-caption leading-[1.45] text-muted">
            The user will be asked to change this password at first sign-in.
          </p>
        </form>
      </Modal>
    </div>
  );
}
