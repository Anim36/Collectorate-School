"use client";

import * as React from "react";

import { AdminTableFooter } from "@/components/admin/admin-table-footer";
import { PortalTable } from "@/components/shared/portal-table";
import type { AdminActivityRow, AdminAttentionRow } from "@/data/admin";

export interface AdminAttentionTableProps {
  /** Rows rendered in the table. */
  rows: readonly AdminAttentionRow[];
  className?: string;
}

/**
 * The dashboard "Attention needed" table.
 *
 * Figma "Data table" (2:9663 desktop, 2:9821 tablet, 2:9973 mobile): three
 * equal columns on desktop and tablet, and a stacked record on mobile where
 * each line is 28px apart.
 */
export function AdminAttentionTable({ rows, className }: AdminAttentionTableProps) {
  const columns = [
    { header: "Task", cell: (row: AdminAttentionRow) => row.task },
    { header: "Count", cell: (row: AdminAttentionRow) => row.count },
    { header: "Action", cell: (row: AdminAttentionRow) => row.action },
  ];

  const mobileRecords = rows.map((row) => ({
    id: row.id,
    lines: [
      { label: "Task", value: row.task },
      { label: "Count", value: row.count },
      { label: "Action", value: row.action },
    ],
  }));

  return (
    <PortalTable
      className={className}
      caption="Attention needed"
      columns={columns}
      rows={rows}
      mobileRecords={mobileRecords}
      mobileRecordSize="uniform"
      footer={<AdminTableFooter records={rows.length} />}
    />
  );
}

export interface AdminActivityTableProps {
  /** Rows rendered in the table. */
  rows: readonly AdminActivityRow[];
  className?: string;
}

/**
 * The dashboard "Recent activity" table.
 *
 * Figma "Data table" (2:9682 desktop, 2:9840 tablet, 2:9988 mobile): three
 * equal columns on desktop and tablet, and a stacked record on mobile.
 */
export function AdminActivityTable({ rows, className }: AdminActivityTableProps) {
  const columns = [
    { header: "Time", cell: (row: AdminActivityRow) => row.time },
    { header: "User", cell: (row: AdminActivityRow) => row.user },
    { header: "Activity", cell: (row: AdminActivityRow) => row.activity },
  ];

  const mobileRecords = rows.map((row) => ({
    id: row.id,
    lines: [
      { label: "Time", value: row.time },
      { label: "User", value: row.user },
      { label: "Activity", value: row.activity },
    ],
  }));

  return (
    <PortalTable
      className={className}
      caption="Recent activity"
      columns={columns}
      rows={rows}
      mobileRecords={mobileRecords}
      mobileRecordSize="uniform"
      footer={<AdminTableFooter records={rows.length} />}
    />
  );
}
