"use client";

import * as React from "react";
import { Download, Upload } from "lucide-react";

import { AdminTableFooter } from "@/components/admin/admin-table-footer";
import { PortalTable } from "@/components/shared/portal-table";
import { Button } from "@/components/ui/button";
import type { AdminCsvRow } from "@/data/admin";

export interface CsvImportPanelProps {
  /** The rows the preview table shows. */
  rows: readonly AdminCsvRow[];
  /** Name of the file that was picked. */
  fileName: string;
  /** How many rows can be imported. */
  ready: number;
  /** How many rows cannot be imported. */
  failed: number;
  /** The problem with the last pick, when there was one. */
  warning: string;
  /** Whether the rows are being written. */
  importing: boolean;
  /** Fired when the admin picks a CSV file. */
  onFilePicked: (file: File) => void;
  /** Fired when the admin asks to import the rows. */
  onReview: () => void;
  className?: string;
}

/**
 * The bulk CSV import panel.
 *
 * Figma "Bulk CSV import" (2:11150 desktop, 2:11300 tablet, 2:11437 mobile):
 * a 640px panel with a 35px title, a 23px caption, the 49px "Download CSV
 * template" action, the 108px drop area, the 46px result line and the 47px
 * "Review import" action.
 *
 * The file is read on the server, so the rows the preview shows are the rows
 * the server checked.
 */
export function CsvImportPanel({
  rows,
  fileName,
  ready,
  failed,
  warning,
  importing,
  onFilePicked,
  onReview,
  className,
}: CsvImportPanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [reviewing, setReviewing] = React.useState(false);

  const previewColumns = [
    { header: "Row", cell: (row: AdminCsvRow) => String(row.row) },
    { header: "Name", cell: (row: AdminCsvRow) => row.name },
    { header: "Role", cell: (row: AdminCsvRow) => row.role },
    { header: "Class", cell: (row: AdminCsvRow) => row.classOrDept },
    { header: "Email", cell: (row: AdminCsvRow) => row.email || "Missing" },
    {
      header: "Ready",
      cell: (row: AdminCsvRow) => (row.valid ? "Yes" : row.problem ?? "No"),
    },
  ];

  const previewRecords = rows.map((row) => ({
    id: `csv-${row.row}`,
    lines: [
      { label: "Row", value: String(row.row) },
      { label: "Name", value: row.name },
      { label: "Role", value: row.role },
      { label: "Class", value: row.classOrDept },
      { label: "Email", value: row.email || "Missing" },
      { label: "Ready", value: row.valid ? "Yes" : row.problem ?? "No" },
    ],
  }));

  if (reviewing) {
    return (
      <section
        className={`flex w-full flex-col items-start gap-4 rounded-[12px] border border-border bg-surface p-6 md:w-[640px] ${
          className ?? ""
        }`}
      >
        <h3 className="text-title font-semibold leading-[1.45] text-ink">
          Review the import
        </h3>

        <p className="text-body leading-[1.45] text-muted">
          {fileName} · {rows.length} rows read from the file.
        </p>

        <div className="w-full">
          <PortalTable
            className="p-4"
            caption="CSV preview"
            columns={previewColumns}
            rows={rows}
            mobileRecords={previewRecords}
            mobileRecordSize="uniform"
            footer={<AdminTableFooter records={rows.length} />}
          />
        </div>

        <Button
          type="button"
          className="h-[47px]"
          disabled={importing || failed > 0 || rows.length === 0}
          onClick={onReview}
        >
          {importing ? "Importing…" : `Import ${rows.length} accounts`}
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="h-[49px]"
          onClick={() => setReviewing(false)}
        >
          Back
        </Button>
      </section>
    );
  }

  return (
    <section
      className={`flex w-full flex-col items-start gap-4 rounded-[12px] border border-border bg-surface p-6 md:w-[640px] ${
        className ?? ""
      }`}
    >
      <h3 className="text-title font-semibold leading-[1.45] text-ink">
        Import school accounts
      </h3>

      <p className="text-body leading-[1.45] text-muted">
        Upload a CSV with name, role, class and email.
      </p>

      <Button type="button" variant="secondary" className="h-[49px]">
        <Download aria-hidden className="size-4" />
        Download CSV template
      </Button>

      {/* The drop area. */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) onFilePicked(file);
        }}
        className={`flex h-[108px] w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6 transition-colors ${
          dragging ? "border-primary bg-tint" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 border-0 bg-transparent p-0 text-body leading-[1.45] text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Upload aria-hidden className="size-4 text-muted" />
          Drop a CSV here or browse
        </button>

        <p className="mt-4 text-caption leading-[1.45] text-muted">
          {fileName} · {rows.length} rows
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Choose a CSV file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFilePicked(file);
          }}
        />
      </div>

      {/* The result of the last pick — one block of two lines. */}
      <div className="flex w-full flex-col">
        <p className="text-body leading-[1.45] text-success">
          ✓ {ready} rows ready to import
        </p>
        <p className="text-body leading-[1.45] text-danger">
          {warning ||
            (failed > 0
              ? `${failed} row(s) need fixing before they can be imported`
              : "")}
        </p>
      </div>

      <Button
        type="button"
        className="h-[47px]"
        disabled={rows.length === 0}
        onClick={() => setReviewing(true)}
      >
        Review import
      </Button>
    </section>
  );
}
