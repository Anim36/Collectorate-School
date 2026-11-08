"use client";

import * as React from "react";
import { FileText, Paperclip, Trash2 } from "lucide-react";

import {
  AdminCheckboxGroup,
  AdminSelectField,
  AdminTextAreaField,
} from "@/components/admin/admin-fields";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { PortalTable } from "@/components/shared/portal-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminGreeting } from "@/data/admin";
import {
  ADMIN_NOTICE_AUDIENCES,
  ADMIN_NOTICE_CATEGORIES,
  ADMIN_NOTICE_PUBLISH_DATE,
  adminNoticeHint,
  adminNotices,
  type AdminNotice,
  type AdminNoticeAudience,
} from "@/data/admin-11b";

/**
 * The admin notices page.
 *
 * Figma "Admin / Notices" (2:11912 desktop, 2:12070 tablet, 2:12189 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 76px title field, the
 *   76px category dropdown, the 250px rich text editor, the 35px audience
 *   heading, the 23px audience row, the 138px attachments block, the 76px
 *   publish date field, the 49px publishing controls and the 19px draft note.
 * - Tablet (768): the same rhythm.
 * - Mobile (375): 24px padding, a 111px heading, a 99px title field, a 319px
 *   editor, a 161px attachments block and 112px publishing controls, which
 *   stack the two buttons.
 *
 * The frame draws the editor. The list of the notices already written sits
 * behind the "List" switch on the heading row, so the editor keeps the exact
 * rhythm Figma measures.
 *
 * Everything happens in memory: the notices, the audience selection and the
 * attachments are held in the page state.
 */
export function AdminNotices() {
  const { toast } = useToast();

  const [view, setView] = React.useState<"editor" | "list">("editor");
  const [notices, setNotices] =
    React.useState<readonly AdminNotice[]>(adminNotices);
  const [title, setTitle] = React.useState(adminNotices[0].title);
  const [category, setCategory] = React.useState<string>(
    adminNotices[0].category,
  );
  const [body, setBody] = React.useState(adminNotices[0].body);
  const [audiences, setAudiences] = React.useState<readonly AdminNoticeAudience[]>(
    adminNotices[0].audiences,
  );
  const [attachments, setAttachments] = React.useState(
    adminNotices[0].attachments,
  );

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Notices");

  const saveDraft = () => {
    toast({
      title: "Draft saved",
      description: adminNoticeHint,
    });
  };

  const publishNotice = () => {
    const published: AdminNotice = {
      id: `notice-${notices.length + 1}`,
      title: title.trim() || "Untitled notice",
      category,
      body,
      audiences,
      attachments,
      status: "Published",
      publishedOn: "2026-11-04",
    };

    setNotices((previous) => [published, ...previous]);
    setAttachments(published.attachments);

    toast({
      title: "Notice published",
      description: `“${published.title}” is now visible to ${audiences.join(", ") || "nobody"}.`,
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((previous) => previous.filter((file) => file.id !== id));
  };

  const addAttachment = () => {
    setAttachments((previous) => [
      ...previous,
      {
        id: `attachment-${previous.length + 1}`,
        name: `notice-attachment-${previous.length + 1}.pdf`,
        size: "120 KB",
      },
    ]);
  };

  // Opening a notice copies it into the editor.
  const loadNotice = (notice: AdminNotice) => {
    setTitle(notice.title);
    setCategory(notice.category);
    setBody(notice.body);
    setAudiences(notice.audiences);
    setAttachments(notice.attachments);
    setView("editor");
  };

  const publishExisting = (notice: AdminNotice) => {
    setNotices((previous) =>
      previous.map((entry) =>
        entry.id === notice.id ? { ...entry, status: "Published" } : entry,
      ),
    );

    toast({
      title: "Notice published",
      description: `“${notice.title}” is now visible on the notice board.`,
    });
  };

  const deleteNotice = (notice: AdminNotice) => {
    setNotices((previous) =>
      previous.filter((entry) => entry.id !== notice.id),
    );

    toast({
      title: "Notice deleted",
      description: `“${notice.title}” was removed from the notice board.`,
    });
  };

  const columns = [
    { header: "Notice", cell: (row: AdminNotice) => row.title },
    { header: "Category", cell: (row: AdminNotice) => row.category },
    {
      header: "Audience",
      cell: (row: AdminNotice) => row.audiences.join(", "),
    },
    {
      header: "Status",
      cell: (row: AdminNotice) => (
        <Badge variant={row.status === "Published" ? "success" : "default"}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row: AdminNotice) => (
        <span className="flex flex-wrap items-center gap-x-1">
          <RowAction onClick={() => loadNotice(row)}>Edit</RowAction>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <RowAction onClick={() => publishExisting(row)}>Publish</RowAction>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <RowAction onClick={() => deleteNotice(row)}>Delete</RowAction>
        </span>
      ),
    },
  ];

  const mobileRecords = notices.map((row) => ({
    id: row.id,
    lines: [
      { label: "Notice", value: row.title },
      { label: "Category", value: row.category },
      { label: "Audience", value: row.audiences.join(", ") },
      { label: "Status", value: row.status },
      { label: "Actions", value: "Edit · Publish · Delete" },
    ],
  }));

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader
        title="Create a notice"
        description={adminGreeting.context}
        aside={
          <button
            type="button"
            onClick={() =>
              setView((current) => (current === "editor" ? "list" : "editor"))
            }
            aria-pressed={view === "list"}
            className="shrink-0 rounded-[6px] text-body font-semibold leading-[1.45] text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {view === "editor" ? "List" : "Editor"}
          </button>
        }
      />

      {view === "editor" ? (
        <>
          <AdminTextAreaField
            label="Notice title"
            value={title}
            onValueChange={setTitle}
          />

          <AdminSelectField
            label="Category"
            options={ADMIN_NOTICE_CATEGORIES}
            value={category}
            onValueChange={setCategory}
            className="md:w-[420px]"
          />

          <RichTextEditor value={body} onChange={setBody} />

          <AdminCheckboxGroup
            label="Who should see this?"
            options={ADMIN_NOTICE_AUDIENCES}
            selected={audiences}
            onChange={setAudiences}
          />

          {/* The attachments. */}
          <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="mb-4 flex w-full items-center gap-3 last:mb-0"
              >
                <Paperclip aria-hidden className="size-4 shrink-0 text-muted" />
                <span className="flex-1 text-body leading-[1.45] text-ink">
                  {file.name} · {file.size}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeAttachment(file.id)}
                  className="flex size-6 items-center justify-center rounded-[6px] text-muted transition-colors hover:bg-tint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              className="h-[49px] w-[175px]"
              onClick={addAttachment}
            >
              <FileText aria-hidden className="size-4" />
              Add attachment
            </Button>
          </section>

          {/* The publish date. */}
          <div className="flex w-full flex-col items-start">
            <p className="text-caption font-medium leading-[1.45] text-muted">
              Publish date
            </p>
            <p className="mt-2 flex h-[49px] w-full items-center rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink md:w-[480px]">
              {ADMIN_NOTICE_PUBLISH_DATE}
            </p>
          </div>

          {/* The publishing controls. */}
          <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:gap-4">
            <Button
              type="button"
              variant="secondary"
              className="h-[49px] w-[130px] shrink-0"
              onClick={saveDraft}
            >
              Save draft
            </Button>

            <Button
              type="button"
              className="h-[47px] w-[158px] shrink-0"
              onClick={publishNotice}
            >
              Publish notice
            </Button>
          </div>

          <p className="text-caption leading-[1.45] text-muted">
            {adminNoticeHint}
          </p>
        </>
      ) : (
        <PortalTable
          caption="Published notices"
          columns={columns}
          rows={notices}
          mobileRecords={mobileRecords}
          mobileRecordSize="uniform"
        />
      )}
    </div>
  );
}

/** A row action, drawn as a quiet link. */
function RowAction({
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
