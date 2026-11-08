"use client";

import * as React from "react";

import { AdminTableFooter } from "@/components/admin/admin-table-footer";
import { PortalTable } from "@/components/shared/portal-table";
import { TablePagination } from "@/components/shared/table-pagination";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/data/admin";

export interface AdminUsersTableProps {
  /** Rows rendered in the table. */
  rows: readonly AdminUser[];
  /** Number of accounts matching the filters. */
  totalRecords: number;
  /** Zero-based index of the visible page. */
  page: number;
  /** Number of records per page. */
  pageSize: number;
  /** Fired when the admin moves between pages. */
  onPageChange: (page: number) => void;
  /** Fired when the admin resets an account's password. */
  onResetPassword: (user: AdminUser) => void;
  /** Fired when the admin activates or deactivates an account. */
  onToggleStatus: (user: AdminUser) => void;
  className?: string;
}

/**
 * The users table.
 *
 * Figma "Data table" (2:10147 desktop, 2:10286 tablet, 2:10418 mobile):
 *
 * - Desktop (1440): five equal columns — Name, Role, Class / Dept., Status
 *   and Actions. A row is 44px tall, so the rows sit on a 60px pitch and the
 *   table is 368px tall.
 * - Tablet (768): the same five columns. The action copy wraps onto two lines,
 *   so a row is 64px tall and the table is 448px tall.
 * - Mobile (375): each account becomes a stacked record of five labelled lines
 *   — "Name:  …", "Role:  …", "Class / Dept.:  …", "Status:  …" and
 *   "Actions:  …" — 28px apart, each on a 20px line.
 *
 * The account count and the page controls sit under the table, as Figma draws
 * them on the users frame.
 */
export function AdminUsersTable({
  rows,
  totalRecords,
  page,
  pageSize,
  onPageChange,
  onResetPassword,
  onToggleStatus,
  className,
}: AdminUsersTableProps) {
  const firstRecord = totalRecords === 0 ? 0 : page * pageSize + 1;
  const lastRecord = Math.min(totalRecords, (page + 1) * pageSize);

  const columns = [
    { header: "Name", cell: (row: AdminUser) => row.name },
    { header: "Role", cell: (row: AdminUser) => row.role },
    { header: "Class / Dept.", cell: (row: AdminUser) => row.classOrDept },
    {
      header: "Status",
      // Figma draws the status as plain copy in the cell, so a badge would
      // make the row taller than the 44px Figma measures.
      cell: (row: AdminUser) => (
        <span
          className={cn(
            row.status === "Active" ? "text-success" : "text-danger",
          )}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row: AdminUser) => (
        <span className="flex flex-wrap items-center gap-x-1">
          {row.status === "Active" ? (
            <>
              <ActionButton onClick={() => onResetPassword(row)}>
                Reset password
              </ActionButton>
              <span aria-hidden className="text-muted">
                ·
              </span>
              <ActionButton onClick={() => onToggleStatus(row)}>
                Deactivate
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton onClick={() => onToggleStatus(row)}>
                Activate
              </ActionButton>
              <span aria-hidden className="text-muted">
                ·
              </span>
              <ActionButton onClick={() => onResetPassword(row)}>
                Reset password
              </ActionButton>
            </>
          )}
        </span>
      ),
    },
  ];

  const mobileRecords = rows.map((row) => ({
    id: row.id,
    lines: [
      { label: "Name", value: row.name },
      { label: "Role", value: row.role },
      { label: "Class / Dept.", value: row.classOrDept },
      { label: "Status", value: row.status },
      {
        label: "Actions",
        value:
          row.status === "Active"
            ? "Reset password · Deactivate"
            : "Activate · Reset password",
      },
    ],
  }));

  return (
    <>
      <PortalTable
        className={className}
        caption="Users"
        columns={columns}
        rows={rows}
        mobileRecords={mobileRecords}
        mobileRecordSize="uniform"
        footer={<AdminTableFooter records={rows.length} />}
      />

      {/* The account count and the page controls. */}
      <TablePagination
        className="mt-0"
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        summary={`Showing ${firstRecord}–${lastRecord} of ${totalRecords.toLocaleString("en-US")} users`}
        compact
      />
    </>
  );
}

/** A row action, drawn as a quiet link. */
function ActionButton({
  onClick,
  children,
}: {
  /** Fired when the admin clicks the action. */
  onClick: () => void;
  /** Label of the action. */
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[6px] text-body-md text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}
