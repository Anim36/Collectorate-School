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

/**
 * The class form.
 *
 * A class needs a name, its place in the school and the teacher in charge of
 * it. The school runs one group per class, so there is no section to pick.
 */
const classSchema = z.object({
  name: z.string().trim().min(2, "Enter the class name"),
  sortOrder: z.coerce.number().int().min(0, "Enter the place in the school"),
  gradingMode: z.enum(["GPA", "GRADE_ONLY"]),
  classTeacherId: z.string().trim().min(1, "Pick a class teacher"),
});

type ClassValues = z.infer<typeof classSchema>;

export interface ClassModalProps {
  /** The classes the school has, so the next free place can be offered. */
  classes: readonly {
    id: string;
    name: string;
    sortOrder: number;
  }[];
  /** The teachers that can be picked. */
  teachers: readonly { id: string; name: string }[];
  /** Called when the reader dismisses the modal. */
  onClose: () => void;
  /** Called with the saved class. */
  onSave: (values: {
    id?: string;
    name: string;
    sortOrder: number;
    gradingMode: "GPA" | "GRADE_ONLY";
    classTeacherId: string;
  }) => void;
}

/**
 * The add and edit class dialog.
 */
export function ClassModal({
  classes,
  teachers,
  onClose,
  onSave,
}: ClassModalProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      sortOrder: classes.length,
      gradingMode: "GPA",
      classTeacherId: "",
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Add a class"
        description="A class has one group and a class teacher."
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
              sortOrder: values.sortOrder,
              gradingMode: values.gradingMode,
              classTeacherId: values.classTeacherId,
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
              Place in the school
            </span>
            <Controller
              control={control}
              name="sortOrder"
              render={({ field }) => (
                <input
                  id="admin-class-sort-order"
                  type="number"
                  min={0}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="12"
                  className="mt-2 h-[49px] w-full rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            />
            {errors.sortOrder ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.sortOrder.message}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Grading
            </span>
            <Controller
              control={control}
              name="gradingMode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="admin-class-grading"
                    aria-label="Grading"
                    className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
                  >
                    <SelectValue placeholder="GPA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GPA">Grade point (GPA)</SelectItem>
                    <SelectItem value="GRADE_ONLY">Grade only</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gradingMode ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.gradingMode.message}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Class teacher
            </span>
            <Controller
              control={control}
              name="classTeacherId"
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
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.classTeacherId ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.classTeacherId.message}
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
 * A subject needs the class it is taught in, the subject itself and the
 * teacher who takes it.
 */
const subjectSchema = z.object({
  subjectId: z.string().trim().min(1, "Pick a subject"),
  teacherId: z.string().trim().min(1, "Pick a teacher"),
  classId: z.string().trim().min(1, "Pick a class"),
});

type SubjectValues = z.infer<typeof subjectSchema>;

export interface SubjectModalProps {
  /** The subjects of the school. */
  subjects: readonly { id: string; name: string }[];
  /** The teachers that can be picked. */
  teachers: readonly { id: string; name: string }[];
  /** The classes of the school. */
  classes: readonly { id: string; name: string }[];
  /** Called when the reader dismisses the modal. */
  onClose: () => void;
  /** Called with the saved allocation. */
  onSave: (values: {
    subjectId: string;
    teacherId: string;
    classId: string;
    subjectName: string;
    teacherName: string;
    className: string;
  }) => void;
}

/**
 * The assign-subject dialog.
 */
export function SubjectModal({
  subjects,
  teachers,
  classes,
  onClose,
  onSave,
}: SubjectModalProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { subjectId: "", teacherId: "", classId: "" },
  });

  const subjectName = (id: string) =>
    subjects.find((subject) => subject.id === id)?.name ?? "";

  const teacherName = (id: string) =>
    teachers.find((teacher) => teacher.id === id)?.name ?? "";

  const className = (id: string) =>
    classes.find((classOption) => classOption.id === id)?.name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Assign a subject"
        description="A subject is taught by one teacher in a class."
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
              subjectId: values.subjectId,
              teacherId: values.teacherId,
              classId: values.classId,
              subjectName: subjectName(values.subjectId),
              teacherName: teacherName(values.teacherId),
              className: className(values.classId),
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
              name="subjectId"
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
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subjectId ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.subjectId.message}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Teacher
            </span>
            <Controller
              control={control}
              name="teacherId"
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
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.teacherId ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.teacherId.message}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Class
            </span>
            <Controller
              control={control}
              name="classId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="admin-subject-classes"
                    aria-label="Class"
                    className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
                  >
                    <SelectValue placeholder="Class 9" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classOption) => (
                      <SelectItem key={classOption.id} value={classOption.id}>
                        {classOption.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.classId ? (
              <p className="mt-2 text-caption leading-[1.45] text-danger">
                {errors.classId.message}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>
    </div>
  );
}
