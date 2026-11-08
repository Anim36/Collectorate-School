"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

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
  adminClasses,
  adminSubjects,
  adminTeachers,
} from "@/data/admin";

/**
 * The class form.
 *
 * A class needs a name, its sections and the teacher in charge of it.
 */
const classSchema = z.object({
  name: z.string().trim().min(2, "Enter the class name"),
  sections: z
    .string()
    .trim()
    .min(1, "List at least one section"),
  classTeacher: z.string().trim().min(1, "Pick a class teacher"),
});

type ClassValues = z.infer<typeof classSchema>;

export interface ClassModalProps {
  /** Called when the reader dismisses the modal. */
  onClose: () => void;
  /** Called with the saved class or subject. */
  onSave: (values: {
    id?: string;
    name: string;
    sections: string[];
    students: number;
    classTeacher: string;
  }) => void;
}

/**
 * The add and edit class dialog.
 *
 * The class is only recorded in memory — nothing is sent to a server.
 */
export function ClassModal({ onClose, onSave }: ClassModalProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassValues>({
    resolver: zodResolver(classSchema),
    defaultValues: { name: "", sections: "A, B, C", classTeacher: "" },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Add a class"
        description="A class runs one or more sections and has a class teacher."
        onClose={onClose}
        className="max-w-[640px]"
        footer={
          <>
            <Button type="submit" form="admin-class" className="h-[47px]">
              Save class
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
          id="admin-class"
          onSubmit={handleSubmit((values) => {
            onSave({
              name: values.name.trim(),
              sections: values.sections
                .split(",")
                .map((section) => section.trim())
                .filter((section) => section !== ""),
              students: 0,
              classTeacher: values.classTeacher,
            });
          })}
          className="flex w-full flex-col gap-4"
          noValidate
        >
          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Class name
            </span>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <input
                  id="admin-class-name"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Class 11"
                  className="mt-2 h-[49px] w-full rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            />
            {errors.name ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Sections
            </span>
            <Controller
              control={control}
              name="sections"
              render={({ field }) => (
                <input
                  id="admin-class-sections"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="A, B, C"
                  className="mt-2 h-[49px] w-full rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            />
            {errors.sections ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.sections.message}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Class teacher
            </span>
            <Controller
              control={control}
              name="classTeacher"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="admin-class-teacher"
                    aria-label="Class teacher"
                    className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
                  >
                    <SelectValue placeholder="Farhana Akter" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminTeachers.map((teacher) => (
                      <SelectItem key={teacher} value={teacher}>
                        {teacher}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.classTeacher ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.classTeacher.message}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>
    </div>
  );
}

/**
 * The subject allocation form.
 *
 * A subject needs its name, the teacher who takes it and the classes it is
 * taught in.
 */
const subjectSchema = z.object({
  subject: z.string().trim().min(1, "Pick a subject"),
  teacher: z.string().trim().min(1, "Pick a teacher"),
  classes: z.string().trim().min(1, "Pick at least one class"),
});

type SubjectValues = z.infer<typeof subjectSchema>;

export interface SubjectModalProps {
  /** Called when the reader dismisses the modal. */
  onClose: () => void;
  /** Called with the saved allocation. */
  onSave: (values: {
    subject: string;
    teacher: string;
    classes: string;
  }) => void;
}

/**
 * The assign-subject dialog.
 *
 * The allocation is only recorded in memory — nothing is sent to a server.
 */
export function SubjectModal({ onClose, onSave }: SubjectModalProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { subject: "", teacher: "", classes: "" },
  });

  const classLabels = adminClasses.map((classOption) => classOption.label);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Assign a subject"
        description="A subject is taught by one teacher across a set of classes."
        onClose={onClose}
        className="max-w-[640px]"
        footer={
          <>
            <Button type="submit" form="admin-subject" className="h-[47px]">
              Assign subject
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
          id="admin-subject"
          onSubmit={handleSubmit((values) => {
            onSave({
              subject: values.subject,
              teacher: values.teacher,
              classes: values.classes,
            });
          })}
          className="flex w-full flex-col gap-4"
          noValidate
        >
          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Subject
            </span>
            <Controller
              control={control}
              name="subject"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="admin-subject-name"
                    aria-label="Subject"
                    className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
                  >
                    <SelectValue placeholder="Mathematics" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subject ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.subject.message}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Teacher
            </span>
            <Controller
              control={control}
              name="teacher"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="admin-subject-teacher"
                    aria-label="Teacher"
                    className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
                  >
                    <SelectValue placeholder="Farhana Akter" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminTeachers.map((teacher) => (
                      <SelectItem key={teacher} value={teacher}>
                        {teacher}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.teacher ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.teacher.message}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Classes
            </span>
            <Controller
              control={control}
              name="classes"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="admin-subject-classes"
                    aria-label="Classes"
                    className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
                  >
                    <SelectValue placeholder="6–10" />
                  </SelectTrigger>
                  <SelectContent>
                    {classLabels.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.classes ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.classes.message}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>
    </div>
  );
}
