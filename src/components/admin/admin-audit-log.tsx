"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { AdminAuditFilters } from "@/components/admin/admin-audit-filters";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableFooter } from "@/components/admin/admin-table-footer";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { PortalTable } from "@/components/shared/portal-table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { listAuditLogAction } from "@/app/admin/actions";
import type { AdminAuditEvent } from "@/types/admin-11c";

/**
 * The options of the action-type filter.
 *
 * The first one shows every event, the rest name the kinds of change the
 * school makes.
 */
const ACTION_OPTIONS = [
  "All actions",
  "Account",
  "Class",
  "Subject",
  "Fee",
  "Payment",
  "Notice",
  "Gallery",
  "Routine",
  "Calendar",
  "File",
  "Other",
] as const;

/**
 * The page size the audit log shows.
 *
 * Figma draws four events on a page, so a page holds four rows.
 */
const PAGE_SIZE = 4;

export interface AdminAuditLogProps {
  /** The events the server read for the first page. */
  initialEvents: {
    rows: AdminAuditEvent[];
    total: number;
  } | null;
  /** The context line under the heading. */
  greeting: string;
}

/**
 * Hands a CSV file to the browser.
 */
function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * The admin audit log page.
 *
 * Figma "Admin / Audit Log" (2:14191 desktop, 2:14361 tablet, 2:14492 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 76px selection filters,
 *   the 368px audit table, the 19px read-only note and the 49px "Export audit
 *   log" action.
 * - Tablet (768): the same rhythm.
 * - Mobile (375): 24px padding, a 41px heading, a 168px filter block, the 549px
 *   table, the 38px note and the 49px action.
 *
 * The log is read-only: nothing on the page edits an event. The log itself is
 * read from the database, and the search, the action-type filter and the
 * pagination run on the server, so the count in the footer is the number of
 * events that really match.
 */
export function AdminAuditLog({ initialEvents, greeting }: AdminAuditLogProps) {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Audit Log");

  const [events, setEvents] = React.useState<readonly AdminAuditEvent[]>(
    initialEvents?.rows ?? [],
  );
  const [total, setTotal] = React.useState(initialEvents?.total ?? 0);
  const [query, setQuery] = React.useState("");
  const [action, setAction] = React.useState<string>(ACTION_OPTIONS[0]);
  const [page, setPage] = React.useState(0);

  /**
   * Reads the log from the server.
   */
  const load = React.useCallback(
    async (nextPage: number) => {
      const result = await listAuditLogAction({
        query,
        actionType: action === "All actions" ? "ALL" : action,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      if (!result.ok) {
        toast({
          title: "Could not load the audit log",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setEvents(result.data.rows);
      setTotal(result.data.total);
    },
    [query, action, toast],
  );

  // The log is read again when the filters change.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      void load(0);
    }, 250);

    return () => clearTimeout(timer);
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);

  const columns = [
    { header: "Time", cell: (row: AdminAuditEvent) => row.time },
    { header: "User", cell: (row: AdminAuditEvent) => row.user },
    { header: "Action", cell: (row: AdminAuditEvent) => row.action },
    { header: "Record", cell: (row: AdminAuditEvent) => row.record },
  ];

  const mobileRecords = events.map((row) => ({
    id: row.id,
    lines: [
      { label: "Time", value: row.time },
      { label: "User", value: row.user },
      { label: "Action", value: row.action },
      { label: "Record", value: row.record },
    ],
  }));

  /**
   * Downloads the events that match the filters as a CSV file.
   */
  const exportLog = async () => {
    const result = await listAuditLogAction({
      query,
      actionType: action === "All actions" ? "ALL" : action,
      page: 0,
      pageSize: 100,
    });

    if (!result.ok) {
      toast({
        title: "Export failed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    const header = ["Time", "User", "Action", "Record", "Type", "Detail"];

    const lines = [header.join(",")];

    for (const row of result.data.rows) {
      lines.push(
        [row.time, row.user, row.action, row.record, row.type, row.detail]
          .map(csvCell)
          .join(","),
      );
    }

    downloadCsv("audit-log.csv", `${lines.join("\r\n")}\r\n`);

    toast({
      title: "Export ready",
      description: `${result.data.total} audit event(s) are ready to export.`,
    });
  };

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader title="Audit Log" description={greeting} />

      <AdminAuditFilters
        query={query}
        onQueryChange={setQuery}
        action={action}
        onActionChange={setAction}
        actionOptions={ACTION_OPTIONS}
      />

      <PortalTable
        caption="Audit log"
        columns={columns}
        rows={events}
        mobileRecords={mobileRecords}
        mobileRecordSize="uniform"
        footer={
          <AdminTableFooter
            records={events.length}
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        }
      />

      <p className="text-caption leading-[1.45] text-muted">
        Audit records are read-only and retained for school compliance ·{" "}
        {total} event{total === 1 ? "" : "s"} on record
      </p>

      <Button
        type="button"
        variant="secondary"
        className="h-[49px] w-[173px] shrink-0"
        onClick={() => void exportLog()}
      >
        <Download aria-hidden className="size-4" />
        Export audit log
      </Button>
    </div>
  );
}

/**
 * Escapes one cell of a CSV.
 *
 * A cell that starts with =, +, - or @ is prefixed with a quote, so a
 * spreadsheet never reads it as a formula.
 */
function csvCell(value: string): string {
  const text = value ?? "";

  const escaped =
    text.startsWith("=") ||
    text.startsWith("+") ||
    text.startsWith("-") ||
    text.startsWith("@")
      ? `'${text}`
      : text;

  if (
    escaped.includes(",") ||
    escaped.includes('"') ||
    escaped.includes("\n")
  ) {
    return `"${escaped.replace(/"/g, '""')}"`;
  }

  return escaped;
}
