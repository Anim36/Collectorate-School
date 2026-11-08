"use client";

import { PortalTable } from "@/components/shared/portal-table";
import { countAttendance, type AttendanceSheet } from "@/data/teacher";

export interface TeacherAttendanceHistoryTableProps {
  /** Sheets rendered in the table. */
  sheets: readonly AttendanceSheet[];
  /** Fired when a reader opens a saved sheet. */
  onOpenSheet: (sheet: AttendanceSheet) => void;
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
 */
export function TeacherAttendanceHistoryTable({
  sheets,
  onOpenSheet,
  className,
}: TeacherAttendanceHistoryTableProps) {
  const columns = [
    { header: "Date", cell: (sheet: AttendanceSheet) => sheet.dateLabel },
    {
      header: "Present",
      cell: (sheet: AttendanceSheet) => String(countAttendance(sheet.marks).present),
    },
    {
      header: "Absent",
      cell: (sheet: AttendanceSheet) => String(countAttendance(sheet.marks).absent),
    },
    {
      header: "Late",
      cell: (sheet: AttendanceSheet) => String(countAttendance(sheet.marks).late),
    },
    { header: "Status", cell: (sheet: AttendanceSheet) => sheet.status },
  ];

  const mobileRecords = sheets.map((sheet) => {
    const counts = countAttendance(sheet.marks);

    return {
      id: sheet.id,
      lines: [
        { label: "Date", value: sheet.dateLabel },
        { label: "Present", value: String(counts.present) },
        { label: "Absent", value: String(counts.absent) },
        { label: "Late", value: String(counts.late) },
        { label: "Status", value: sheet.status },
      ],
    };
  });

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
