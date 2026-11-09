"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import {
  AdminCheckboxGroup,
  AdminDateField,
  AdminSearchField,
  AdminSelectField,
  AdminTextAreaField,
} from "@/components/admin/admin-fields";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { PortalTable } from "@/components/shared/portal-table";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminGreeting } from "@/data/admin";
import { encodeFile } from "@/lib/file-transfer";
import {
  attachFilesAction,
  deleteNoticeAction,
  listNoticesAction,
  publishNoticeAction,
  removeAttachmentAction,
  saveNoticeAction,
  unpublishNoticeAction,
} from "@/app/admin/actions";
import type { AdminNoticeList, AdminNoticeRow } from "@/types/admin-11b";

/** The audiences a notice can be addressed to. */
type Audience = "PUBLIC" | "STUDENTS" | "TEACHERS" | "GUARDIANS";

/** The audiences the editor offers, in the order Figma lists them. */
const AUDIENCE_OPTIONS: readonly Audience[] = [
  "PUBLIC",
  "STUDENTS",
  "TEACHERS",
];

/**
 * The audiences the list filter offers.
 *
 * The filter reaches every audience the table holds, so it also offers the
 * one the editor does not show.
 */
const AUDIENCE_FILTER_OPTIONS: readonly Audience[] = [
  ...AUDIENCE_OPTIONS,
  "GUARDIANS",
];

/** The names the audiences are shown under. */
const AUDIENCE_LABELS: Record<Audience, string> = {
  PUBLIC: "Public",
  STUDENTS: "Students",
  TEACHERS: "Teachers",
  GUARDIANS: "Guardians",
};

/** The copy under the notice editor's title, as Figma draws it. */
const NOTICE_HINT = "Draft saved just now. Nothing is public until you publish.";

/** The page size the notices table shows. */
const PAGE_SIZE = 10;

export interface AdminNoticesProps {
  /** The notices the server read for the first page. */
  initialNotices: AdminNoticeList | null;
  /** The categories the notice editor offers. */
  categories: readonly string[];
}

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
 * The notices are read from the database: the search, the filters and the
 * pagination run on the server, so the count in the footer is the number of
 * notices that really match.
 */
export function AdminNotices({ initialNotices, categories }: AdminNoticesProps) {
  const { toast } = useToast();

  const [view, setView] = React.useState<"editor" | "list">("editor");
  const [notices, setNotices] = React.useState<readonly AdminNoticeRow[]>(
    initialNotices?.rows ?? [],
  );
  const [total, setTotal] = React.useState(initialNotices?.total ?? 0);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("ALL");
  const [audience, setAudience] = React.useState("ALL");
  const [status, setStatus] = React.useState("ALL");
  const [page, setPage] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // The list is read again when the filters change, so the page shows that
  // it is waiting while the new rows are on their way.
  const [loading, setLoading] = React.useState(false);

  // The editor works on one notice at a time.
  const [editingId, setEditingId] = React.useState<string | null>(
    initialNotices?.rows[0]?.id ?? null,
  );
  const [title, setTitle] = React.useState(initialNotices?.rows[0]?.title ?? "");
  const [noticeCategory, setNoticeCategory] = React.useState<string>(
    initialNotices?.rows[0]?.category ?? categories[0] ?? "Academic",
  );
  const [body, setBody] = React.useState(initialNotices?.rows[0]?.body ?? "");
  const [audiences, setAudiences] = React.useState<readonly Audience[]>(
    (initialNotices?.rows[0]?.audiences ?? ["PUBLIC"]) as Audience[],
  );
  /**
   * The audiences of the notice that the editor does not show.
   *
   * The editor offers the three audiences the design draws, so a notice that
   * carries another one keeps it when the notice is saved again.
   */
  const [hiddenAudiences, setHiddenAudiences] = React.useState<
    readonly Audience[]
  >(
    (initialNotices?.rows[0]?.audiences ?? []).filter(
      (audience): audience is Audience =>
        !AUDIENCE_OPTIONS.includes(audience as Audience),
    ),
  );
  const [attachments, setAttachments] = React.useState(
    initialNotices?.rows[0]?.attachments ?? [],
  );
  const [publishDate, setPublishDate] = React.useState(
    initialNotices?.rows[0]?.publishedOn ?? "",
  );

  // The file picker is opened by the "Add attachment" button.
  const fileInput = React.useRef<HTMLInputElement>(null);

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Notices");

  /**
   * Reads a page of notices from the server.
   */
  const load = React.useCallback(
    async (nextPage: number) => {
      setLoading(true);

      const result = await listNoticesAction({
        query,
        category,
        audience,
        status,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setLoading(false);

      if (!result.ok) {
        toast({
          title: "Could not load the notices",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setNotices(result.data.rows);
      setTotal(result.data.total);
    },
    [query, category, audience, status, toast],
  );

  // The list is read again when the filters change.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      void load(0);
    }, 250);

    return () => clearTimeout(timer);
  }, [load]);

  /**
   * Copies a notice into the editor.
   */
  const loadNotice = (notice: AdminNoticeRow) => {
    setEditingId(notice.id);
    setTitle(notice.title);
    setNoticeCategory(notice.category);
    setBody(notice.body);
    setAudiences(notice.audiences as Audience[]);
    setHiddenAudiences(
      notice.audiences.filter(
        (audience): audience is Audience =>
          !AUDIENCE_OPTIONS.includes(audience as Audience),
      ),
    );
    setAttachments(notice.attachments);
    setPublishDate(notice.publishedOn ?? "");
    setView("editor");
  };

  /**
   * Starts a new notice.
   */
  const startNewNotice = () => {
    setEditingId(null);
    setTitle("");
    setNoticeCategory(categories[0] ?? "Academic");
    setBody("");
    setAudiences(["PUBLIC"]);
    setHiddenAudiences([]);
    setAttachments([]);
    setPublishDate("");
    setView("editor");
  };

  /**
   * Saves the notice the editor holds.
   *
   * A notice that has no id yet is created, and one that has one is edited.
   */
  const save = async (publish: boolean) => {
    if (busy) return;

    setBusy(true);

    const result = await saveNoticeAction({
      id: editingId ?? undefined,
      title,
      body,
      category: noticeCategory,
      audiences: [...new Set([...audiences, ...hiddenAudiences])],
      publishedOn: publishDate || undefined,
    });

    if (!result.ok) {
      setBusy(false);

      toast({
        title: publish ? "Notice not published" : "Draft not saved",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    const noticeId = result.data.id;

    if (publish) {
      const published = await publishNoticeAction(noticeId);

      if (!published.ok) {
        setBusy(false);

        toast({
          title: "Notice not published",
          description: published.error,
          variant: "destructive",
        });
        return;
      }

      setPublishDate(published.data.publishedOn);
    }

    setEditingId(noticeId);
    setBusy(false);

    await load(page);

    toast({
      title: publish ? "Notice published" : "Draft saved",
      description: publish
        ? `“${result.data.title}” is now visible to ${audienceLabel(audiences)}.`
        : NOTICE_HINT,
    });
  };

  /**
   * Publishes a notice that is already written, or takes it back.
   */
  const togglePublish = async (notice: AdminNoticeRow) => {
    const result =
      notice.status === "Published"
        ? await unpublishNoticeAction(notice.id)
        : await publishNoticeAction(notice.id);

    if (!result.ok) {
      toast({
        title: "Notice not changed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await load(page);

    toast({
      title:
        notice.status === "Published" ? "Notice unpublished" : "Notice published",
      description:
        notice.status === "Published"
          ? `“${notice.title}” is a draft again.`
          : `“${notice.title}” is now visible on the notice board.`,
    });
  };

  /**
   * Removes a notice.
   */
  const remove = async (notice: AdminNoticeRow) => {
    const result = await deleteNoticeAction(notice.id);

    if (!result.ok) {
      toast({
        title: "Notice not deleted",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    if (editingId === notice.id) {
      startNewNotice();
    }

    await load(page);

    toast({
      title: "Notice deleted",
      description: `“${notice.title}” was removed from the notice board.`,
    });
  };

  /**
   * Removes an attachment from the notice.
   */
  const removeAttachment = async (attachmentId: string) => {
    const result = await removeAttachmentAction(attachmentId);

    if (!result.ok) {
      toast({
        title: "Attachment not removed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setAttachments((previous) =>
      previous.filter((entry) => entry.id !== attachmentId),
    );
  };

  /**
   * Uploads the files the admin picked and attaches them to the notice.
   */
  const attachFiles = async (files: File[]) => {
    if (!editingId) {
      toast({
        title: "Save the notice first",
        description:
          "A notice has to be saved before files can be attached to it.",
        variant: "destructive",
      });
      return;
    }

    const payloads = await Promise.all(files.map(encodeFile));

    const result = await attachFilesAction({
      noticeId: editingId,
      files: payloads,
    });

    if (!result.ok) {
      toast({
        title: "File not attached",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    const fresh = await listNoticesAction({ page: 0, pageSize: PAGE_SIZE });

    if (fresh.ok) {
      setNotices(fresh.data.rows);
      setTotal(fresh.data.total);

      const updated = fresh.data.rows.find(
        (row) => row.id === editingId,
      );

      if (updated) setAttachments(updated.attachments);
    }

    toast({
      title: "File attached",
      description: `${result.data.attached} file(s) were attached to the notice.`,
    });
  };

  const columns = [
    { header: "Notice", cell: (row: AdminNoticeRow) => row.title },
    { header: "Category", cell: (row: AdminNoticeRow) => row.category },
    {
      header: "Audience",
      cell: (row: AdminNoticeRow) => audienceLabel(row.audiences),
    },
    {
      header: "Status",
      cell: (row: AdminNoticeRow) => (
        <Badge variant={row.status === "Published" ? "success" : "default"}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row: AdminNoticeRow) => (
        <span className="flex flex-wrap items-center gap-x-1">
          <RowAction onClick={() => loadNotice(row)}>Edit</RowAction>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <RowAction onClick={() => togglePublish(row)}>
            {row.status === "Published" ? "Unpublish" : "Publish"}
          </RowAction>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <RowAction onClick={() => remove(row)}>Delete</RowAction>
        </span>
      ),
    },
  ];

  const mobileRecords = notices.map((row) => ({
    id: row.id,
    lines: [
      { label: "Notice", value: row.title },
      { label: "Category", value: row.category },
      { label: "Audience", value: audienceLabel(row.audiences) },
      { label: "Status", value: row.status },
      { label: "Actions", value: "Edit · Publish · Delete" },
    ],
  }));

  const firstRecord = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRecord = Math.min(total, (page + 1) * PAGE_SIZE);

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
            options={categories}
            value={noticeCategory}
            onValueChange={setNoticeCategory}
            className="md:w-[420px]"
          />

          <RichTextEditor value={body} onChange={setBody} />

          <AdminCheckboxGroup
            label="Who should see this?"
            options={AUDIENCE_OPTIONS}
            selected={audiences}
            optionLabel={(audience) => AUDIENCE_LABELS[audience] ?? audience}
            onChange={(selected) =>
              setAudiences(
                selected.map(
                  (audience) =>
                    (AUDIENCE_LABELS[audience as Audience]
                      ? audience
                      : "PUBLIC") as Audience,
                ),
              )
            }
          />

          {/* The attachments. */}
          <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="mb-4 flex w-full items-center gap-3 last:mb-0"
              >
                <span className="flex-1 text-body leading-[1.45] text-ink">
                  {file.name} · {file.size}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => void removeAttachment(file.id)}
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
              onClick={() => fileInput.current?.click()}
            >
              Add attachment
            </Button>

            <input
              ref={fileInput}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              multiple
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);

                event.target.value = "";

                if (files.length === 0) return;

                void attachFiles(files);
              }}
            />
          </section>

          {/* The publish date. */}
          <AdminDateField
            label="Publish date"
            value={publishDate}
            onValueChange={setPublishDate}
            placeholder="Not published yet"
            className="md:w-[480px]"
          />

          {/* The publishing controls. */}
          <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:gap-4">
            <Button
              type="button"
              variant="secondary"
              className="h-[49px] w-[130px] shrink-0"
              disabled={busy}
              onClick={() => void save(false)}
            >
              Save draft
            </Button>

            <Button
              type="button"
              className="h-[47px] w-[158px] shrink-0"
              disabled={busy}
              onClick={() => void save(true)}
            >
              Publish notice
            </Button>
          </div>

          <p className="text-caption leading-[1.45] text-muted">{NOTICE_HINT}</p>
        </>
      ) : (
        <>
          {/* The list filters. */}
          <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end md:gap-4">
            <AdminSearchField
              label="Search notices"
              value={query}
              onValueChange={setQuery}
              placeholder="Search notices…"
              className="md:w-[344px] md:shrink-0 xl:w-[560px]"
            />

            <AdminSelectField
              label="Category"
              options={["ALL", ...categories]}
              value={category}
              onValueChange={setCategory}
              className="md:w-[344px] md:shrink-0 xl:w-[560px]"
            />

            <AdminSelectField
              label="Audience"
              options={["ALL", ...AUDIENCE_FILTER_OPTIONS]}
              value={audience}
              onValueChange={setAudience}
              className="md:w-[344px] md:shrink-0 xl:w-[560px]"
            />

            <AdminSelectField
              label="Status"
              options={["ALL", "DRAFT", "PUBLISHED"]}
              value={status}
              onValueChange={setStatus}
              className="md:w-[344px] md:shrink-0 xl:w-[560px]"
            />
          </div>

          <Button
            type="button"
            className="h-[47px] w-[152px] shrink-0"
            onClick={startNewNotice}
          >
            New notice
          </Button>

          <PortalTable
            caption="Published notices"
            columns={columns}
            rows={notices}
            mobileRecords={mobileRecords}
            mobileRecordSize="uniform"
            footer={
              <p className="mt-4 text-caption leading-[1.45] text-muted">
                Showing {notices.length} records
                &nbsp;&nbsp;•&nbsp;&nbsp;‹&nbsp;&nbsp;1&nbsp;&nbsp;›
              </p>
            }
          />

          {/* The list is empty: the panel says so instead of leaving a bare
              table behind. */}
          {notices.length === 0 && !loading ? (
            <EmptyState
              message={
                total === 0
                  ? "No notices yet"
                  : "Nothing matches those filters"
              }
              title={
                total === 0
                  ? "New notices will appear here."
                  : "Try a different search or filter."
              }
            />
          ) : null}

          {/* The list is on its way: the panel holds the rhythm Figma draws
              while the rows are loaded. */}
          {loading ? (
            <LoadingSkeleton
              message="Loading the notices"
              title="Fetching the notices…"
            />
          ) : null}

          <TablePagination
            className="mt-0"
            totalRecords={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={(next) => {
              setPage(next);
              void load(next);
            }}
            summary={`Showing ${firstRecord}–${lastRecord} of ${total.toLocaleString("en-US")} notices`}
            compact
          />
        </>
      )}
    </div>
  );
}

/** The names of the audiences, the way the table shows them. */
function audienceLabel(audiences: readonly string[]): string {
  const labels = audiences
    .filter((audience): audience is Audience => audience in AUDIENCE_LABELS)
    .map((audience) => AUDIENCE_LABELS[audience]);

  return labels.length > 0 ? labels.join(", ") : "—";
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
