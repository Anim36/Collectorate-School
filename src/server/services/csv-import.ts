import bcrypt from "bcryptjs";

import { prisma } from "@/server/db";
import { BCRYPT_COST } from "@/server/auth-types";
import { normalizeLoginId } from "@/server/services/users";
import { generateTemporaryPassword } from "@/server/services/users";
import type { ServiceResult } from "@/server/services/admin-schemas";

/* ------------------------------------------------------------------ types --- */

/** The most rows a file may hold. */
export const MAX_CSV_ROWS = 500;

/** The largest file that is read, in bytes. */
export const MAX_CSV_BYTES = 1024 * 1024;

/** One row of the preview table. */
export interface CsvPreviewRow {
  /** The line the row came from, counting from 1. */
  row: number;
  /** The name on the row. */
  name: string;
  /** The role on the row. */
  role: "Student" | "Teacher";
  /** The class on the row. */
  classOrDept: string;
  /** The email address on the row. */
  email: string;
  /** Whether the row can be imported. */
  valid: boolean;
  /** Why the row cannot be imported. */
  problem?: string;
}

/** The answer to a preview request. */
export interface CsvPreview {
  /** The rows of the file, with the errors on them. */
  rows: CsvPreviewRow[];
  /** How many rows can be imported. */
  ready: number;
  /** How many rows cannot be imported. */
  failed: number;
  /** The name of the file, as the admin gave it. */
  fileName: string;
}

/* -------------------------------------------------------------- utilities --- */

/**
 * Escapes a cell so a spreadsheet does not read it as a formula.
 *
 * A cell that starts with =, +, - or @ is prefixed with a quote, so it is
 * shown as the text it is.
 */
export function escapeFormulaCell(value: string): string {
  if (value === "") return value;

  const first = value.charAt(0);

  if (first === "=" || first === "+" || first === "-" || first === "@") {
    return `'${value}`;
  }

  return value;
}

/**
 * Splits one line of CSV into its cells.
 *
 * It understands quoted cells and the commas inside them.
 */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quoted) {
      if (character === '"') {
        // A doubled quote inside a quoted cell is one quote.
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += character;
      }

      continue;
    }

    if (character === '"') {
      quoted = true;
      continue;
    }

    if (character === ",") {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());

  return cells;
}

/**
 * The header of the file, worked out from the columns that are present.
 *
 * The file may name the columns in any order, so the header is read into a
 * map and the rows are looked up by name.
 */
function readHeader(cells: string[]): Map<string, number> {
  const header = new Map<string, number>();

  cells.forEach((cell, index) => {
    header.set(cell.trim().toLowerCase().replace(/\s+/g, ""), index);
  });

  return header;
}

/** The columns the file may hold. */
const COLUMN_NAMES = ["name", "role", "class", "email", "temppassword"];

/**
 * Checks a file and reports what each row would do.
 *
 * Nothing is written: the preview only reads.
 */
export async function previewCsv(
  actorId: string,
  file: { name: string; text: string; size: number },
): Promise<ServiceResult<CsvPreview>> {
  void actorId;

  // The name and the size are checked, not the type the browser claims.
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false, error: "Only a .csv file can be imported" };
  }

  if (file.size > MAX_CSV_BYTES) {
    return { ok: false, error: "The file is larger than 1 MB" };
  }

  const lines = file.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) {
    return { ok: false, error: "The file is empty" };
  }

  const [headerLine, ...body] = lines;
  const header = readHeader(parseCsvLine(headerLine));

  const missing = COLUMN_NAMES.filter(
    (column) => column !== "temppassword" && !header.has(column),
  );

  if (missing.length > 0) {
    return {
      ok: false,
      error: `The file is missing the ${missing.join(", ")} column(s)`,
    };
  }

  if (body.length > MAX_CSV_ROWS) {
    return {
      ok: false,
      error: `The file has ${body.length} rows; the limit is ${MAX_CSV_ROWS}`,
    };
  }

  const classNames = new Map(
    (await prisma.class.findMany({ select: { id: true, name: true } })).map(
      (row) => [row.name.toLowerCase(), row.id],
    ),
  );

  const existingLogins = new Set(
    (
      await prisma.user.findMany({ select: { loginIdNormalized: true } })
    ).map((row) => row.loginIdNormalized),
  );

  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } }))
      .map((row) => row.email?.toLowerCase() ?? "")
      .filter((email) => email !== ""),
  );

  const rows: CsvPreviewRow[] = [];
  const seenEmails = new Set<string>();
  let ready = 0;

  body.forEach((line, index) => {
    const cells = parseCsvLine(line);
    const cell = (name: string) => cells[header.get(name) ?? -1] ?? "";

    const name = cell("name");
    const roleRaw = cell("role").toLowerCase();
    const className = cell("class");
    const email = cell("email");
    const password = cell("temppassword");

    const problems: string[] = [];

    if (name === "") problems.push("The name is missing");

    const role: "Student" | "Teacher" =
      roleRaw === "teacher" ? "Teacher" : "Student";

    if (roleRaw !== "" && roleRaw !== "student" && roleRaw !== "teacher") {
      problems.push("The role is not Student or Teacher");
    }

    if (role === "Student" && className === "") {
      problems.push("The class is missing");
    } else if (role === "Student" && !classNames.has(className.toLowerCase())) {
      problems.push(`There is no class called ${className}`);
    }

    if (email === "") {
      problems.push("Email address is missing");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      problems.push("The email address is not valid");
    } else {
      const key = email.toLowerCase();

      if (existingEmails.has(key)) {
        problems.push("That email address is already in use");
      } else if (seenEmails.has(key)) {
        problems.push("That email address is in the file twice");
      } else {
        seenEmails.add(key);
      }
    }

    if (password !== "" && !isStrongEnough(password)) {
      problems.push("The temporary password is too weak");
    }

    const valid = problems.length === 0;

    if (valid) ready += 1;

    rows.push({
      row: index + 1,
      name: escapeFormulaCell(name),
      role,
      classOrDept: escapeFormulaCell(className),
      email: escapeFormulaCell(email),
      valid,
      ...(valid ? {} : { problem: problems.join(". ") }),
    });
  });

  void existingLogins;

  return {
    ok: true,
    data: { rows, ready, failed: rows.length - ready, fileName: file.name },
  };
}

/**
 * Whether a password is strong enough.
 *
 * It has to be at least twelve characters and hold a number.
 */
function isStrongEnough(password: string): boolean {
  return password.length >= 12 && /\d/.test(password);
}

/**
 * Writes the rows of a file.
 *
 * Every row is written in one transaction, so a failure leaves the roll
 * exactly as it was.
 */
export async function commitCsv(
  actorId: string,
  file: { name: string; text: string; size: number },
): Promise<ServiceResult<{ imported: number }>> {
  const preview = await previewCsv(actorId, file);

  if (!preview.ok) return preview;

  if (preview.data.failed > 0) {
    return {
      ok: false,
      error: `Fix the ${preview.data.failed} row(s) with errors before importing`,
    };
  }

  const classNames = new Map(
    (await prisma.class.findMany({ select: { id: true, name: true } })).map(
      (row) => [row.name.toLowerCase(), row.id],
    ),
  );

  const lines = file.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  const [headerLine, ...body] = lines;
  const header = readHeader(parseCsvLine(headerLine));

  try {
    const imported = await prisma.$transaction(async (tx) => {
      let count = 0;

      for (const line of body) {
        const cells = parseCsvLine(line);
        const cell = (name: string) => cells[header.get(name) ?? -1] ?? "";

        const name = cell("name");
        const role = cell("role").toLowerCase() === "teacher" ? "TEACHER" : "STUDENT";
        const className = cell("class");
        const email = cell("email") || undefined;
        const password = cell("temppassword") || generateTemporaryPassword();

        const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

        if (role === "STUDENT") {
          const classId = classNames.get(className.toLowerCase());

          if (!classId) {
            throw new Error("UNKNOWN_CLASS");
          }

          const section = await tx.section.findFirst({
            where: { classId, isDefault: true },
            select: { id: true },
          });

          const academicYear = await tx.academicYear.findFirst({
            where: { isCurrent: true },
            select: { id: true },
          });

          if (!section || !academicYear) {
            throw new Error("NO_SECTION");
          }

          const year = new Date().getUTCFullYear();
          const prefix = `ST-${year}-`;

          const last = await tx.student.findFirst({
            where: { studentId: { startsWith: prefix } },
            orderBy: { studentId: "desc" },
            select: { studentId: true },
          });

          const highest = last
            ? Number.parseInt(last.studentId.slice(prefix.length), 10)
            : 0;

          let loginId = `${prefix}${String(highest + 1).padStart(4, "0")}`;
          let suffix = highest + 2;

          while (
            await tx.student.findUnique({
              where: { studentId: loginId },
              select: { id: true },
            })
          ) {
            loginId = `${prefix}${String(suffix).padStart(4, "0")}`;
            suffix += 1;
          }

          const highestRoll = await tx.student.findFirst({
            where: { classId, academicYearId: academicYear.id },
            orderBy: { roll: "desc" },
            select: { roll: true },
          });

          const user = await tx.user.create({
            data: {
              loginId,
              loginIdNormalized: normalizeLoginId(loginId),
              name,
              email,
              passwordHash,
              role: "STUDENT",
              classOrDepartment: className,
              mustChangePassword: true,
              isActive: true,
            },
            select: { id: true },
          });

          await tx.student.create({
            data: {
              userId: user.id,
              studentId: loginId,
              name,
              classId,
              sectionId: section.id,
              academicYearId: academicYear.id,
              roll: (highestRoll?.roll ?? 0) + 1,
            },
          });
        } else {
          const base = `teacher-${name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")}`;

          let loginId = base;
          let suffix = 2;

          while (
            await tx.user.findUnique({
              where: { loginIdNormalized: normalizeLoginId(loginId) },
              select: { id: true },
            })
          ) {
            loginId = `${base}-${suffix}`;
            suffix += 1;
          }

          const user = await tx.user.create({
            data: {
              loginId,
              loginIdNormalized: normalizeLoginId(loginId),
              name,
              email,
              passwordHash,
              role: "TEACHER",
              classOrDepartment: className || undefined,
              mustChangePassword: true,
              isActive: true,
            },
            select: { id: true },
          });

          await tx.teacher.create({
            data: {
              userId: user.id,
              designation: className ? `Teacher · ${className}` : "Teacher",
              department: className || undefined,
            },
          });
        }

        count += 1;
      }

      return count;
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        action: "Users imported",
        entityType: "Account",
        entityId: actorId,
        metadata: { rows: imported, fileName: file.name },
      },
    });

    return { ok: true, data: { imported } };
  } catch (error) {
    if (error instanceof Error && error.message === "UNKNOWN_CLASS") {
      return { ok: false, error: "One of the rows names a class that does not exist" };
    }

    if (error instanceof Error && error.message === "NO_SECTION") {
      return { ok: false, error: "One of the classes has no section to put a student in" };
    }

    return { ok: false, error: "The rows could not be imported" };
  }
}
