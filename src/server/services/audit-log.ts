import { prisma } from "@/server/db";
import {
  listAuditLogSchema,
  type ListAuditLogInput,
} from "@/server/services/admin-11c-schemas";
import type {
  AdminAuditActionType,
  AdminAuditEvent,
  AdminAuditList,
} from "@/types/admin-11c";

/**
 * The audit log of the school.
 *
 * The page is read-only: nothing in this module writes to `audit_log`, and
 * there is no action anywhere that edits or removes an event.
 *
 * The rows are read through the database, so the count in the footer is the
 * number of events that really match the filters, and the name of the actor
 * comes from a join rather than from an id.
 */

/**
 * The label of every action the school writes.
 *
 * The codes are grouped in one place, so the log reads the same way whichever
 * screen wrote the row, and an action nobody has mapped yet still shows a
 * readable label instead of a raw code.
 */
const ACTION_LABELS: Record<string, string> = {
  /* ----------------------------------------------------------- accounts --- */
  "Login successful": "Signed in",
  "Login failed": "Sign-in failed",
  "Login refused": "Sign-in refused",
  "Account locked": "Account locked",
  "Signed out": "Signed out",
  "User created": "Created account",
  "User edited": "Edited account",
  "User activated": "Activated account",
  "User deactivated": "Deactivated account",
  "Users imported": "Imported accounts",
  "Password changed": "Changed own password",
  "Password change refused": "Password change refused",
  "Password reset": "Reset password",

  /* ------------------------------------------------------------- classes --- */
  "Class created": "Created class",
  "Class edited": "Edited class",
  "Class removed": "Removed class",
  "Subject created": "Created subject",
  "Subject edited": "Edited subject",
  "Subject assigned": "Assigned subject",
  "Subject unassigned": "Removed subject assignment",

  /* -------------------------------------------------------------- fees --- */
  "Fee structure edited": "Edited fee structure",
  "Fees issued": "Issued fees",
  "Payment recorded": "Recorded payment",
  "Payment approved": "Approved payment",
  "Payment rejected": "Rejected payment",
  "Receipt created": "Issued receipt",

  /* ------------------------------------------------------------ notices --- */
  "Notice created": "Created notice",
  "Notice edited": "Edited notice",
  "Notice published": "Published notice",
  "Notice unpublished": "Unpublished notice",
  "Notice deleted": "Deleted notice",
  "Files attached to notice": "Attached files to notice",
  "Notice attachment removed": "Removed notice attachment",

  /* ------------------------------------------------------------ gallery --- */
  "Album created": "Created album",
  "Album renamed": "Renamed album",
  "Album deleted": "Deleted album",
  "Photos uploaded": "Uploaded photographs",
  "Photo approved": "Approved photograph",
  "Photo rejected": "Sent photograph back",
  "Photo deleted": "Deleted photograph",

  /* ------------------------------------------------------------ routine --- */
  "Routine saved": "Saved timetable",
  "Routine published": "Published timetable",

  /* ----------------------------------------------------------- calendar --- */
  "Calendar event created": "Created calendar event",
  "Calendar event edited": "Edited calendar event",
  "Calendar event deleted": "Deleted calendar event",

  /* --------------------------------------------------------------- file --- */
  "File deleted": "Deleted file",
};

/**
 * The kind of change every action belongs to.
 *
 * It is worked out from the code rather than from the label, so a row that
 * was written by an older version of the code still lands in the right group.
 */
const ACTION_TYPES: Record<string, AdminAuditActionType> = {
  "Login successful": "Account",
  "Login failed": "Account",
  "Login refused": "Account",
  "Account locked": "Account",
  "Signed out": "Account",
  "User created": "Account",
  "User edited": "Account",
  "User activated": "Account",
  "User deactivated": "Account",
  "Users imported": "Account",
  "Password changed": "Account",
  "Password change refused": "Account",
  "Password reset": "Account",

  "Class created": "Class",
  "Class edited": "Class",
  "Class removed": "Class",
  "Subject created": "Subject",
  "Subject edited": "Subject",
  "Subject assigned": "Subject",
  "Subject unassigned": "Subject",

  "Fee structure edited": "Fee",
  "Fees issued": "Fee",
  "Payment recorded": "Payment",
  "Payment approved": "Payment",
  "Payment rejected": "Payment",
  "Receipt created": "Payment",

  "Notice created": "Notice",
  "Notice edited": "Notice",
  "Notice published": "Notice",
  "Notice unpublished": "Notice",
  "Notice deleted": "Notice",
  "Files attached to notice": "Notice",
  "Notice attachment removed": "Notice",

  "Album created": "Gallery",
  "Album renamed": "Gallery",
  "Album deleted": "Gallery",
  "Photos uploaded": "Gallery",
  "Photo approved": "Gallery",
  "Photo rejected": "Gallery",
  "Photo deleted": "Gallery",

  "Routine saved": "Routine",
  "Routine published": "Routine",

  "Calendar event created": "Calendar",
  "Calendar event edited": "Calendar",
  "Calendar event deleted": "Calendar",

  "File deleted": "File",
};

/**
 * The keys whose value is never shown.
 *
 * A row that carries one of them is redacted, so a bad row that slipped into
 * the table cannot leak a secret through the audit log.
 */
const SECRET_KEYS = [
  "password",
  "passwordhash",
  "passwd",
  "hash",
  "secret",
  "token",
  "cardnumber",
  "cardno",
  "card",
  "cvc",
  "cvv",
  "pin",
  "otp",
  "cardlast4",
];

/**
 * The readable label of an action.
 *
 * An action nobody has mapped yet still reads as a sentence, so the log never
 * shows a raw code.
 */
export function actionLabel(action: string): string {
  const known = ACTION_LABELS[action];

  if (known) return known;

  // An unknown code is turned into a sentence: "Fee structure edited" becomes
  // "Fee structure edited", and a code with no spaces becomes "Unknown action".
  const trimmed = action.trim();

  if (trimmed === "") return "Unknown action";

  const spaced = trimmed.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The kind of change an action belongs to.
 */
export function actionType(action: string): AdminAuditActionType {
  return ACTION_TYPES[action] ?? "Other";
}

/**
 * Whether a key of the metadata holds something secret.
 */
function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase().replace(/[^a-z]/g, "");

  return SECRET_KEYS.some((secret) => lower.includes(secret));
}

/**
 * A short, safe summary of the metadata of an event.
 *
 * The values are only ever read for the keys that are known to be safe, so a
 * password, a hash, a token or card data is never returned, not even when a
 * row holds one.
 */
export function summariseMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }

  const entries = Object.entries(metadata as Record<string, unknown>);

  const parts: string[] = [];

  for (const [key, value] of entries) {
    if (isSecretKey(key)) continue;
    if (value === null || value === undefined) continue;

    if (typeof value === "string") {
      // A long free-text value is not a summary, so it is left out.
      if (value.length === 0 || value.length > 80) continue;
      parts.push(`${key}: ${value}`);
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      parts.push(`${key}: ${String(value)}`);
      continue;
    }

    if (Array.isArray(value)) {
      // A list of names is useful, a list of anything else is not.
      const names = value.filter(
        (entry): entry is string => typeof entry === "string",
      );

      if (names.length === 0 || names.length > 5) continue;
      if (names.some((entry) => entry.length > 80)) continue;

      parts.push(`${key}: ${names.join(", ")}`);
    }
  }

  return parts.slice(0, 4).join(" · ");
}

/**
 * The time of an event, as the table shows it.
 *
 * The frame writes "04 Nov · 10:42", so the day and the time are shown
 * together and the year is left out.
 */
export function formatEventTime(createdAt: Date): string {
  const day = createdAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

  const time = createdAt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return `${day} · ${time}`;
}

/**
 * The audit log of the school, filtered and counted by the database.
 *
 * The search runs on the server, over the name of the actor, the action and
 * the record the event is about, and the count is the number of events that
 * really match.
 */
export async function listAuditLog(
  raw: Partial<ListAuditLogInput> = {},
): Promise<AdminAuditList> {
  const parsed = listAuditLogSchema.safeParse(raw);

  if (!parsed.success) {
    return { rows: [], total: 0, page: 0, pageSize: 10, pageCount: 1 };
  }

  const { query, actionType: wanted, from, to, page, pageSize } = parsed.data;

  const where: Record<string, unknown> = {};

  // The window of the log is worked out on the server, so the rows and the
  // count always cover the same days.
  if (from) where["createdAt"] = { gte: new Date(`${from}T00:00:00.000Z`) };

  if (to) {
    where["createdAt"] = {
      ...(where["createdAt"] as Record<string, unknown> | undefined),
      lte: new Date(`${to}T23:59:59.999Z`),
    };
  }

  const needle = query ?? "";

  if (needle !== "") {
    where["OR"] = [
      { action: { contains: needle, mode: "insensitive" } },
      { entityType: { contains: needle, mode: "insensitive" } },
      { entityId: { contains: needle, mode: "insensitive" } },
      { actor: { name: { contains: needle, mode: "insensitive" } } },
    ];
  }

  // The kind of change is worked out from the action code, so the filter is
  // applied by the database rather than by reading every row into memory.
  if (wanted !== "ALL") {
    const codes = Object.entries(ACTION_TYPES)
      .filter(([, type]) => type === wanted)
      .map(([code]) => code);

    where["action"] = { in: codes };
  }

  const [total, events] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      // The newest event comes first, as the log is read.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);

  const rows: AdminAuditEvent[] = events.map((event) => ({
    id: event.id,
    time: formatEventTime(event.createdAt),
    // The name of the actor, never an id on its own.
    user: event.actor?.name ?? "Unknown actor",
    action: actionLabel(event.action),
    record: event.entityId,
    type: actionType(event.action),
    detail: summariseMetadata(event.metadata),
  }));

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * The kinds of change the log holds, for the filter.
 */
export function auditActionTypes(): readonly AdminAuditActionType[] {
  return [
    "Account",
    "Result",
    "Attendance",
    "Fee",
    "Payment",
    "Notice",
    "Class",
    "Subject",
    "Gallery",
    "Routine",
    "Calendar",
    "File",
    "Other",
  ];
}
