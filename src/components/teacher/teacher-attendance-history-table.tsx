"use client";

import { PortalTable } from "@/components/shared/portal-table";
import type { TeacherAttendanceHistoryRow } from "@/types/teacher";

export interface TeacherAttendanceHistoryTableProps {
  /** Sheets rendered in the table. */
  sheets: readonly TeacherAttendanceHistoryRow[];
  /** Fired when a reader opens a saved sheet. */
  onOpenSheet: (sheet: TeacherAttendanceHistoryRow) => void;
  className?: string;
}

/**
 * The attendance history table.
 *
 * Figma "Data table" (2:7553 desktop, 2:7683 tablet, 2:7806 mobile):
 *
 * - Desktop (1440): five equal columns, so the table is 308px tall and the
 *   rows sit on a 60px pitch.
 * - Tablet (768): five equal columns.
 * - Mobile (375): each sheet becomes a stacked record of five labelled
 *   lines — "Date:  …", "Present:  …", "Absent:  …", "Late:  …" and
 *   "Status:  Saved" — 8px apart, so the record is 132px tall.
 *
 * The counts come from the database, so the numbers in the table are the
 * numbers the school holds.
 */
export function TeacherAttendanceHistoryTable({
  sheets,
  onOpenSheet,
  className,
}: TeacherAttendanceHistoryTableProps) {
  const columns = [
    { header: "Date", cell: (sheet: TeacherAttendanceHistoryRow) => sheet.dateLabel },
    {
      header: "Present",
      cell: (sheet: TeacherAttendanceHistoryRow) => String(sheet.present),
    },
    {
      header: "Absent",
      cell: (sheet: TeacherAttendanceHistoryRow) => String(sheet.absent),
    },
    {
      header: "Late",
      cell: (sheet: TeacherAttendanceHistoryRow) => String(sheet.late),
    },
    { header: "Status", cell: (sheet: TeacherAttendanceHistoryRow) => sheet.status },
  ];

  const mobileRecords = sheets.map((sheet) => ({
    id: sheet.id,
    lines: [
      { label: "Date", value: sheet.dateLabel },
      { label: "Present", value: String(sheet.present) },
      { label: "Absent", value: String(sheet.absent) },
      { label: "Late", value: String(sheet.late) },
      { label: "Status", value: sheet.status },
    ],
  }));

  return (
    <PortalTable
      className={className}
      caption="Attendance history"
      columns={columns}
      rows={sheets}
      mobileRecords={mobileRecords}
      mobileRecordSize="uniform"
      onRowClick={onOpenSheet}
    />
  );
}
