import { PortalTable } from "@/components/shared/portal-table";
import type {
  TeacherAttendanceRow,
  TeacherClassRow,
  TeacherNoticeSummaryRow,
} from "@/types/teacher";

export interface TeacherClassesTableProps {
  /** Rows rendered in the table. */
  rows: readonly TeacherClassRow[];
  className?: string;
}

/**
 * The dashboard "My classes" table.
 *
 * Figma "Data table" (2:6484 desktop, 2:6648 tablet, 2:6806 mobile):
 *
 * - Desktop (1440): four equal columns. A row is 44px tall, so the rows sit
 *   on a 60px pitch and the table is 308px tall.
 * - Tablet (768): four equal columns; the table stays 308px tall.
 * - Mobile (375): each class becomes a stacked record of four labelled lines
 *   — "Class:  …", "Subject:  …", "Time:  …" and "Room:  …" — 8px apart,
 *   each on a 20px line.
 */
export function TeacherClassesTable({ rows, className }: TeacherClassesTableProps) {
  const columns = [
    { header: "Class", cell: (row: TeacherClassRow) => row.className },
    { header: "Subject", cell: (row: TeacherClassRow) => row.subject },
    { header: "Time", cell: (row: TeacherClassRow) => row.time },
    { header: "Room", cell: (row: TeacherClassRow) => row.room },
  ];

  const mobileRecords = rows.map((row) => ({
    id: row.className,
    lines: [
      { label: "Class", value: row.className },
      { label: "Subject", value: row.subject },
      { label: "Time", value: row.time },
      { label: "Room", value: row.room },
    ],
  }));

  return (
    <PortalTable
      className={className}
      caption="My classes"
      columns={columns}
      rows={rows}
      mobileRecords={mobileRecords}
      mobileRecordSize="uniform"
    />
  );
}

export interface TeacherAttendanceTableProps {
  /** Rows rendered in the table. */
  rows: readonly TeacherAttendanceRow[];
  className?: string;
}

/**
 * The dashboard "Today's attendance" table.
 *
 * Figma "Data table" (2:6507 desktop, 2:6671 tablet, 2:6824 mobile):
 * three equal columns on desktop and tablet, and a stacked record on mobile.
 */
export function TeacherAttendanceTable({
  rows,
  className,
}: TeacherAttendanceTableProps) {
  const columns = [
    { header: "Class", cell: (row: TeacherAttendanceRow) => row.className },
    { header: "Students", cell: (row: TeacherAttendanceRow) => String(row.students) },
    { header: "Status", cell: (row: TeacherAttendanceRow) => row.status },
  ];

  const mobileRecords = rows.map((row) => ({
    id: row.className,
    lines: [
      { label: "Class", value: row.className },
      { label: "Students", value: String(row.students) },
      { label: "Status", value: row.status },
    ],
  }));

  return (
    <PortalTable
      className={className}
      caption="Today's attendance"
      columns={columns}
      rows={rows}
      mobileRecords={mobileRecords}
      mobileRecordSize="uniform"
    />
  );
}

export interface TeacherNoticesTableProps {
  /** Rows rendered in the table. */
  rows: readonly TeacherNoticeSummaryRow[];
  className?: string;
}

/**
 * The dashboard "Recent notices" table.
 *
 * Figma "Data table" (2:6526 desktop, 2:6690 tablet, 2:6839 mobile): two
 * equal columns on desktop and tablet, and a stacked record on mobile where
 * the headline may wrap to two lines.
 */
export function TeacherNoticesTable({ rows, className }: TeacherNoticesTableProps) {
  const columns = [
    { header: "Date", cell: (row: TeacherNoticeSummaryRow) => row.date },
    { header: "Notice", cell: (row: TeacherNoticeSummaryRow) => row.notice },
  ];

  const mobileRecords = rows.map((row) => ({
    id: row.notice,
    lines: [
      { label: "Date", value: row.date },
      { label: "Notice", value: row.notice },
    ],
  }));

  return (
    <PortalTable
      className={className}
      caption="Recent notices"
      columns={columns}
      rows={rows}
      mobileRecords={mobileRecords}
      mobileRecordSize="uniform"
    />
  );
}
