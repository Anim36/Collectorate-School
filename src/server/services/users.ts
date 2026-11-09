import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

import { prisma } from "@/server/db";
import { BCRYPT_COST } from "@/server/auth-types";
import {
  createUserSchema,
  editUserSchema,
  listUsersSchema,
  type CreateUserInput,
  type EditUserInput,
  type ListUsersInput,
  type ServiceResult,
} from "@/server/services/admin-schemas";

/* ------------------------------------------------------------------ types --- */

/** A row of the users table. */
export interface UserListRow {
  /** The id of the user row. */
  id: string;
  /** The name of the account. */
  name: string;
  /** The sign-in handle. */
  loginId: string;
  /** The role, as the table shows it. */
  role: "Student" | "Teacher" | "Admin";
  /** The class of a student, the department of a teacher. */
  classOrDept: string;
  /** Whether the account may sign in. */
  status: "Active" | "Inactive";
  /** The email address, when the account has one. */
  email: string;
}

/** The list of accounts, with the count that matches the filters. */
export interface UserList {
  /** The rows of the page. */
  rows: UserListRow[];
  /** How many accounts match the filters, across every page. */
  total: number;
  /** The zero-based page that was read. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many pages there are. */
  pageCount: number;
}

/** What a new account looks like once it is created. */
export interface CreatedUser {
  /** The id of the user row. */
  id: string;
  /** The sign-in handle that was generated. */
  loginId: string;
  /** The name of the account. */
  name: string;
  /** The class the student was placed in. */
  className: string | null;
}

/* -------------------------------------------------------------- utilities --- */

/**
 * The normalised copy of a login id.
 *
 * It is lower cased and trimmed, so "Admin" and "admin" are the same
 * account.
 */
export function normalizeLoginId(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Writes an audit row.
 *
 * The actor is the admin who made the change and the target is the account it
 * was made to. No password data is ever written.
 */
async function writeAudit(input: {
  actorId: string;
  action: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: "Account",
        entityId: input.entityId,
        metadata: (input.metadata ?? {}) as never,
      },
    });
  } catch {
    // The audit write must never break the change it records.
  }
}

/**
 * The next free student id.
 *
 * The ids run ST-<year>-<four digits> and are unique across the school.
 */
async function nextStudentId(year: number): Promise<string> {
  const prefix = `ST-${year}-`;

  const last = await prisma.student.findFirst({
    where: { studentId: { startsWith: prefix } },
    orderBy: { studentId: "desc" },
    select: { studentId: true },
  });

  const highest = last
    ? Number.parseInt(last.studentId.slice(prefix.length), 10)
    : 0;

  // The ids are not allowed to run into the fake ones the seed writes.
  const start = Number.isFinite(highest) ? highest : 0;

  for (let next = start + 1; next < start + 10000; next += 1) {
    const candidate = `${prefix}${String(next).padStart(4, "0")}`;

    const taken = await prisma.student.findUnique({
      where: { studentId: candidate },
      select: { id: true },
    });

    if (!taken) return candidate;
  }

  throw new Error("Could not work out a free student id");
}

/**
 * The login id of a teacher, taken from their name.
 *
 * It is "teacher-first-last", with a number added when the name is already
 * taken.
 */
async function nextTeacherLoginId(name: string): Promise<string> {
  const base = `teacher-${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;

  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;

    const taken = await prisma.user.findUnique({
      where: { loginIdNormalized: normalizeLoginId(candidate) },
      select: { id: true },
    });

    if (!taken) return candidate;
  }

  throw new Error("Could not work out a free teacher id");
}

/**
 * A random temporary password.
 *
 * It is handed to the admin once and never written down anywhere, so it
 * cannot be read back out of the database.
 */
export function generateTemporaryPassword(): string {
  const letters = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = letters + upper + digits + symbols;

  const characters: string[] = [
    letters[randomInt(letters.length)],
    upper[randomInt(upper.length)],
    digits[randomInt(digits.length)],
    symbols[randomInt(symbols.length)],
  ];

  while (characters.length < 14) {
    characters.push(all[randomInt(all.length)]);
  }

  // The characters are shuffled, so the guaranteed ones are not always in
  // the first four places.
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [characters[index], characters[swap]] = [characters[swap], characters[index]];
  }

  return characters.join("");
}

/* ------------------------------------------------------------------- list --- */

/**
 * The accounts of the school, filtered and counted by the database.
 *
 * The search runs on the server, over the name, the login id and the email
 * address. The count is the number of accounts that match the filters, so the
 * "Showing X of Y" line is the real total.
 */
export async function listUsers(
  raw: Partial<ListUsersInput> = {},
): Promise<ServiceResult<UserList>> {
  const parsed = listUsersSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: "Those filters are not valid" };
  }

  const { query, role, status, page, pageSize } = parsed.data;

  const where: Record<string, unknown> = {};

  if (role !== "ALL") where["role"] = role;

  if (status === "ACTIVE") where["isActive"] = true;
  if (status === "INACTIVE") where["isActive"] = false;

  const needle = query ?? "";

  if (needle !== "") {
    where["OR"] = [
      { name: { contains: needle, mode: "insensitive" } },
      { loginId: { contains: needle, mode: "insensitive" } },
      { email: { contains: needle, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        loginId: true,
        role: true,
        classOrDepartment: true,
        isActive: true,
        email: true,
        student: {
          select: {
            class: { select: { name: true } },
          },
        },
        teacher: {
          select: {
            department: true,
          },
        },
      },
    }),
  ]);

  const rows: UserListRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    loginId: user.loginId,
    role:
      user.role === "STUDENT"
        ? "Student"
        : user.role === "TEACHER"
          ? "Teacher"
          : "Admin",
    classOrDept:
      user.student?.class.name ??
      user.teacher?.department ??
      user.classOrDepartment ??
      "—",
    status: user.isActive ? "Active" : "Inactive",
    email: user.email ?? "—",
  }));

  return {
    ok: true,
    data: {
      rows,
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/* ----------------------------------------------------------------- create --- */

/**
 * Creates an account and the profile that goes with it.
 *
 * The user row and the student or teacher profile are written in one
 * transaction, so a failure leaves nothing behind.
 */
export async function createUser(
  actorId: string,
  raw: CreateUserInput,
): Promise<ServiceResult<CreatedUser>> {
  const parsed = createUserSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Those details are not valid",
    };
  }

  const input = parsed.data;

  if (input.role === "STUDENT" && !input.classId) {
    return { ok: false, error: "Pick a class for the student" };
  }

  // An admin can never be created from this screen.
  if ((input.role as string) === "ADMIN") {
    return { ok: false, error: "Admin accounts cannot be created here" };
  }

  const email = input.email ? input.email : undefined;

  if (email) {
    const taken = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (taken) {
      return { ok: false, error: "That email address is already in use" };
    }
  }

  let classRow: { id: string; name: string } | null = null;
  let sectionId: string | null = null;

  if (input.role === "STUDENT" && input.classId) {
    classRow = await prisma.class.findUnique({
      where: { id: input.classId },
      select: { id: true, name: true },
    });

    if (!classRow) {
      return { ok: false, error: "That class does not exist" };
    }

    const section = await prisma.section.findFirst({
      where: { classId: classRow.id, isDefault: true },
      select: { id: true },
    });

    if (!section) {
      return {
        ok: false,
        error: "That class has no section to put the student in",
      };
    }

    sectionId = section.id;
  }

  const year = new Date().getUTCFullYear();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (input.role === "STUDENT") {
        const loginId = await nextStudentId(year);
        const academicYear = await tx.academicYear.findFirst({
          where: { isCurrent: true },
          select: { id: true },
        });

        if (!academicYear) {
          throw new Error("NO_ACADEMIC_YEAR");
        }

        // The roll number is the next free one in the class.
        const highestRoll = await tx.student.findFirst({
          where: {
            classId: classRow!.id,
            academicYearId: academicYear.id,
          },
          orderBy: { roll: "desc" },
          select: { roll: true },
        });

        const roll = (highestRoll?.roll ?? 0) + 1;

        const user = await tx.user.create({
          data: {
            loginId,
            loginIdNormalized: normalizeLoginId(loginId),
            name: input.name,
            email,
            passwordHash,
            role: "STUDENT",
            classOrDepartment: classRow!.name,
            mustChangePassword: true,
            isActive: true,
          },
          select: { id: true },
        });

        await tx.student.create({
          data: {
            userId: user.id,
            studentId: loginId,
            name: input.name,
            classId: classRow!.id,
            sectionId: sectionId!,
            academicYearId: academicYear.id,
            roll,
          },
        });

        return { id: user.id, loginId, name: input.name, className: classRow!.name };
      }

      const loginId = await nextTeacherLoginId(input.name);

      const user = await tx.user.create({
        data: {
          loginId,
          loginIdNormalized: normalizeLoginId(loginId),
          name: input.name,
          email,
          passwordHash,
          role: "TEACHER",
          classOrDepartment: input.department || undefined,
          mustChangePassword: true,
          isActive: true,
        },
        select: { id: true },
      });

      await tx.teacher.create({
        data: {
          userId: user.id,
          designation: input.department
            ? `Teacher · ${input.department}`
            : "Teacher",
          department: input.department || undefined,
        },
      });

      return { id: user.id, loginId, name: input.name, className: null };
    });

    await writeAudit({
      actorId,
      action: "User created",
      entityId: result.id,
      metadata: { role: input.role, loginId: result.loginId },
    });

    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACADEMIC_YEAR") {
      return { ok: false, error: "No academic year is set up yet" };
    }

    return { ok: false, error: "The account could not be created" };
  }
}

/* ------------------------------------------------------------------- edit --- */

/**
 * Edits an account.
 *
 * The role cannot be changed, so an account never turns into a different
 * kind of account behind the admin's back.
 */
export async function editUser(
  actorId: string,
  raw: EditUserInput,
): Promise<ServiceResult<{ id: string; name: string }>> {
  const parsed = editUserSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Those details are not valid",
    };
  }

  const input = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      student: { select: { id: true } },
      teacher: { select: { id: true } },
    },
  });

  if (!user) {
    return { ok: false, error: "That account does not exist" };
  }

  const email = input.email ? input.email : undefined;

  if (email && email !== user.email) {
    const taken = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (taken) {
      return { ok: false, error: "That email address is already in use" };
    }
  }

  let className: string | null = null;

  if (user.student && input.classId) {
    const classRow = await prisma.class.findUnique({
      where: { id: input.classId },
      select: { id: true, name: true },
    });

    if (!classRow) {
      return { ok: false, error: "That class does not exist" };
    }

    const section = await prisma.section.findFirst({
      where: { classId: classRow.id, isDefault: true },
      select: { id: true },
    });

    if (!section) {
      return {
        ok: false,
        error: "That class has no section to put the student in",
      };
    }

    className = classRow.name;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { name: input.name, email, classOrDepartment: className },
      });

      await tx.student.update({
        where: { id: user.student!.id },
        data: { name: input.name, classId: classRow.id, sectionId: section.id },
      });
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        email,
        ...(user.teacher
          ? { classOrDepartment: input.department ?? undefined }
          : {}),
      },
    });

    if (user.teacher) {
      await prisma.teacher.update({
        where: { id: user.teacher.id },
        data: {
          phone: input.phone || undefined,
        },
      });
    }

    if (user.student) {
      await prisma.student.update({
        where: { id: user.student.id },
        data: {
          name: input.name,
          guardianName: input.guardianName || undefined,
          guardianPhone: input.guardianPhone || undefined,
          phone: input.phone || undefined,
        },
      });
    }
  }

  await writeAudit({
    actorId,
    action: "User edited",
    entityId: user.id,
    metadata: { name: input.name },
  });

  return { ok: true, data: { id: user.id, name: input.name } };
}

/* --------------------------------------------------------- activate, reset --- */

/**
 * Deactivates or activates an account.
 *
 * Deactivating moves the session version on, so every session that is open
 * for the account stops working straight away. An admin cannot deactivate
 * their own account, and the last active admin cannot be deactivated.
 */
export async function setUserActive(
  actorId: string,
  userId: string,
  isActive: boolean,
): Promise<ServiceResult<{ id: string; isActive: boolean }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user) {
    return { ok: false, error: "That account does not exist" };
  }

  if (!isActive && user.id === actorId) {
    return { ok: false, error: "You cannot deactivate your own account" };
  }

  if (!isActive && user.role === "ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });

    if (activeAdmins <= 1) {
      return {
        ok: false,
        error: "The last active admin cannot be deactivated",
      };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive,
      // The session version moves, so the sessions that are open for the
      // account stop working.
      ...(isActive ? {} : { sessionVersion: { increment: 1 } }),
    },
  });

  await writeAudit({
    actorId,
    action: isActive ? "User activated" : "User deactivated",
    entityId: user.id,
  });

  return { ok: true, data: { id: user.id, isActive } };
}

/**
 * Resets the password of an account.
 *
 * The new password is hashed and never written down in the clear. The account
 * is asked to change it at the next sign-in, and the sessions that are open
 * for it stop working.
 */
export async function resetUserPassword(
  actorId: string,
  userId: string,
  password: string,
): Promise<ServiceResult<{ id: string }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return { ok: false, error: "That account does not exist" };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });

  await writeAudit({
    actorId,
    action: "Password reset",
    entityId: user.id,
  });

  return { ok: true, data: { id: user.id } };
}
