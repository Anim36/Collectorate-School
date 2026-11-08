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
import { adminGreeting } from "@/data/admin";
import {
  ADMIN_AUDIT_ACTION_TYPES,
  ADMIN_AUDIT_DATE_RANGE,
  ADMIN_AUDIT_PAGE_SIZE,
  adminAuditEvents,
  type AdminAuditEvent,
} from "@/data/admin-11c";

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
 * The log is read-only: nothing on the page edits an event. The search, the
 * action-type filter and the pagination are held in the page state.
 */
export function AdminAuditLog() {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Audit Log");

  const [query, setQuery] = React.useState("");
  const [action, setAction] = React.useState<string>(
    ADMIN_AUDIT_ACTION_TYPES[0],
  );
  const [page, setPage] = React.useState(0);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    return adminAuditEvents.filter((event) => {
      const matchesAction =
        action === ADMIN_AUDIT_ACTION_TYPES[0] || event.type === action;
      if (!matchesAction) return false;
      if (needle === "") return true;

      return (
        event.user.toLowerCase().includes(needle) ||
        event.action.toLowerCase().includes(needle) ||
        event.record.toLowerCase().includes(needle)
      );
    });
  }, [action, query]);

  // A filter change starts the list again from the first page.
  React.useEffect(() => {
    setPage(0);
  }, [action, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_AUDIT_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    currentPage * ADMIN_AUDIT_PAGE_SIZE,
    currentPage * ADMIN_AUDIT_PAGE_SIZE + ADMIN_AUDIT_PAGE_SIZE,
  );

  const columns = [
    { header: "Time", cell: (row: AdminAuditEvent) => row.time },
    { header: "User", cell: (row: AdminAuditEvent) => row.user },
    { header: "Action", cell: (row: AdminAuditEvent) => row.action },
    { header: "Record", cell: (row: AdminAuditEvent) => row.record },
  ];

  const mobileRecords = visible.map((row) => ({
    id: row.id,
    lines: [
      { label: "Time", value: row.time },
      { label: "User", value: row.user },
      { label: "Action", value: row.action },
      { label: "Record", value: row.record },
    ],
  }));

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader title="Audit Log" description={adminGreeting.context} />

      <AdminAuditFilters
        query={query}
        onQueryChange={setQuery}
        action={action}
        onActionChange={setAction}
        actionOptions={ADMIN_AUDIT_ACTION_TYPES}
      />

      <PortalTable
        caption="Audit log"
        columns={columns}
        rows={visible}
        mobileRecords={mobileRecords}
        mobileRecordSize="uniform"
        footer={
          <AdminTableFooter
            records={visible.length}
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        }
      />

      <p className="text-caption leading-[1.45] text-muted">
        Audit records are read-only and retained for school compliance ·{" "}
        {ADMIN_AUDIT_DATE_RANGE}
      </p>

      <Button
        type="button"
        variant="secondary"
        className="h-[49px] w-[173px] shrink-0"
        onClick={() =>
          toast({
            title: "Export ready",
            description: `${filtered.length} audit event(s) are ready to export.`,
          })
        }
      >
        <Download aria-hidden className="size-4" />
        Export audit log
      </Button>
    </div>
  );
}
