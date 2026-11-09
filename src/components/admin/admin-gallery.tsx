"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import {
  AdminSearchField,
  AdminSelectField,
} from "@/components/admin/admin-fields";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { PortalTable } from "@/components/shared/portal-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminGreeting } from "@/data/admin";
import { encodeFile } from "@/lib/file-transfer";
import {
  approvePhotoAction,
  deleteAlbumAction,
  listAlbumsAction,
  listPendingPhotosAction,
  rejectPhotoAction,
  saveAlbumAction,
  uploadPhotosAction,
} from "@/app/admin/actions";
import type {
  AdminAlbumList,
  AdminAlbumRow,
  AdminPhotoReviewRow,
} from "@/types/admin-11b";

/** The categories the gallery filter offers. */
const ALBUM_CATEGORIES = ["All categories", "Academic", "Culture", "Sports"];

export interface AdminGalleryProps {
  /** The albums the server read for the first page. */
  initialAlbums: AdminAlbumList | null;
  /** The photographs that are waiting for the admin. */
  initialPending: AdminPhotoReviewRow[];
}

/**
 * The admin gallery page.
 *
 * Figma "Admin / Gallery" (2:12301 desktop, 2:12470 tablet, 2:12600 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 47px "Create album"
 *   action, the 76px selection filters, the 308px albums table and the 185px
 *   media upload block.
 * - Tablet (768): the same rhythm.
 * - Mobile (375): 24px padding, a 111px heading, the 47px action, a 168px
 *   filter block, a 429px table and a 220px upload block.
 *
 * The frame draws the albums. The queue of the photos the teachers uploaded
 * sits behind the "Approvals" switch on the heading row, so the albums keep
 * the exact rhythm Figma measures.
 *
 * The albums and the photographs are read from the database: a photograph
 * that is approved is shown in the album, and one that is still waiting is
 * held in the queue until the admin decides.
 */
export function AdminGallery({ initialAlbums, initialPending }: AdminGalleryProps) {
  const { toast } = useToast();

  const [view, setView] = React.useState<"albums" | "approvals">("albums");
  const [albums, setAlbums] = React.useState<readonly AdminAlbumRow[]>(
    initialAlbums?.rows ?? [],
  );
  const [reviews, setReviews] = React.useState<readonly AdminPhotoReviewRow[]>(
    initialPending,
  );
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>(ALBUM_CATEGORIES[0]);
  const [busy, setBusy] = React.useState(false);

  // The lists are read again when the filters change, so the page shows that
  // it is waiting while the new rows are on their way.
  const [loading, setLoading] = React.useState(false);

  // The file picker is opened by the "Browse photos" button.
  const fileInput = React.useRef<HTMLInputElement>(null);

  // The album the photographs are uploaded into.
  const [uploadAlbumId, setUploadAlbumId] = React.useState<string>(
    initialAlbums?.rows[0]?.id ?? "",
  );

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Gallery");

  /**
   * Reads the albums from the server.
   */
  const loadAlbums = React.useCallback(
    async (nextQuery: string, nextCategory: string) => {
      setLoading(true);

      const result = await listAlbumsAction({
        query: nextQuery,
        category: nextCategory === ALBUM_CATEGORIES[0] ? "ALL" : nextCategory,
      });

      setLoading(false);

      if (!result.ok) {
        toast({
          title: "Could not load the albums",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setAlbums(result.data.rows);
    },
    [toast],
  );

  // The albums are read again when the filters change.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      void loadAlbums(query, category);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, category, loadAlbums]);

  /**
   * Reads the photographs that are waiting for the admin.
   */
  const loadPending = async () => {
    const result = await listPendingPhotosAction();

    if (!result.ok) {
      toast({
        title: "Could not load the approvals",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setReviews(result.data);
  };

  /**
   * Creates an album.
   */
  const createAlbum = async () => {
    const result = await saveAlbumAction({
      title: `New album ${albums.length + 1}`,
      category: "Academic",
      visibility: "PUBLIC",
    });

    if (!result.ok) {
      toast({
        title: "Album not created",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await loadAlbums(query, category);

    toast({
      title: "Album created",
      description: "The new album is ready for its first photos.",
    });
  };

  /**
   * Renames an album.
   */
  const renameAlbum = async (album: AdminAlbumRow) => {
    const title = window.prompt("Album name", album.title);

    if (!title || title === album.title) return;

    const result = await saveAlbumAction({
      id: album.id,
      title,
      category: album.category,
      visibility: album.visibility === "Public" ? "PUBLIC" : "TEACHERS",
    });

    if (!result.ok) {
      toast({
        title: "Album not renamed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await loadAlbums(query, category);

    toast({
      title: "Album renamed",
      description: `The album is now called “${title}”.`,
    });
  };

  /**
   * Removes an album that holds no photographs.
   */
  const removeAlbum = async (album: AdminAlbumRow) => {
    const result = await deleteAlbumAction(album.id);

    if (!result.ok) {
      toast({
        title: "Album not deleted",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await loadAlbums(query, category);

    toast({
      title: "Album deleted",
      description: `“${album.title}” was removed.`,
    });
  };

  /**
   * Approves a photograph.
   */
  const approve = async (photo: AdminPhotoReviewRow) => {
    const result = await approvePhotoAction(photo.id);

    if (!result.ok) {
      toast({
        title: "Photo not approved",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await loadPending();

    toast({
      title: "Photo approved",
      description: `${photo.name} is now visible in the album.`,
    });
  };

  /**
   * Sends a photograph back to the teacher who uploaded it.
   */
  const reject = async (photo: AdminPhotoReviewRow) => {
    const reason = window.prompt(
      "Why is the photo being sent back?",
      "The photo does not meet the album rules.",
    );

    if (reason === null) return;

    const result = await rejectPhotoAction(photo.id, reason);

    if (!result.ok) {
      toast({
        title: "Photo not rejected",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await loadPending();

    toast({
      title: "Photo rejected",
      description: `${photo.name} was sent back to the teacher.`,
    });
  };

  /**
   * Uploads photographs into an album.
   *
   * The photographs an admin uploads are approved straight away.
   */
  const uploadPhotos = async (files: File[]) => {
    const albumId = uploadAlbumId || albums[0]?.id;

    if (!albumId) {
      toast({
        title: "No album to upload into",
        description: "Create an album first.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);

    const payloads = await Promise.all(files.map(encodeFile));

    const result = await uploadPhotosAction({ albumId, files: payloads });

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Photos not uploaded",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await loadAlbums(query, category);

    toast({
      title: "Photos uploaded",
      description: `${result.data.uploaded} photo(s) were added to the album.`,
    });
  };

  const albumColumns = [
    { header: "Album", cell: (row: AdminAlbumRow) => row.title },
    { header: "Photos", cell: (row: AdminAlbumRow) => String(row.photoCount) },
    { header: "Visibility", cell: (row: AdminAlbumRow) => row.visibility },
    {
      header: "Actions",
      cell: (row: AdminAlbumRow) => (
        <span className="flex flex-wrap items-center gap-x-1">
          <RowAction onClick={() => renameAlbum(row)}>Edit</RowAction>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <RowAction
            onClick={() => {
              setUploadAlbumId(row.id);
              fileInput.current?.click();
            }}
          >
            Add photos
          </RowAction>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <RowAction onClick={() => removeAlbum(row)}>Delete</RowAction>
        </span>
      ),
    },
  ];

  const albumRecords = albums.map((row) => ({
    id: row.id,
    lines: [
      { label: "Album", value: row.title },
      { label: "Photos", value: String(row.photoCount) },
      { label: "Visibility", value: row.visibility },
      { label: "Actions", value: "Edit · Add photos · Delete" },
    ],
  }));

  const reviewColumns = [
    { header: "Photo", cell: (row: AdminPhotoReviewRow) => row.name },
    { header: "Album", cell: (row: AdminPhotoReviewRow) => row.album },
    { header: "Size", cell: (row: AdminPhotoReviewRow) => row.size },
    {
      header: "Status",
      cell: (row: AdminPhotoReviewRow) =>
        row.state === "Awaiting admin approval" ? (
          <Badge variant="warning">{row.state}</Badge>
        ) : (
          row.state
        ),
    },
    {
      header: "Actions",
      cell: (row: AdminPhotoReviewRow) => (
        <span className="flex flex-wrap items-center gap-x-1">
          <RowAction onClick={() => approve(row)}>Approve</RowAction>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <RowAction onClick={() => reject(row)}>Reject</RowAction>
        </span>
      ),
    },
  ];

  const reviewRecords = reviews.map((row) => ({
    id: row.id,
    lines: [
      { label: "Photo", value: row.name },
      { label: "Album", value: row.album },
      { label: "Size", value: row.size },
      { label: "Status", value: row.state },
      { label: "Actions", value: "Approve · Reject" },
    ],
  }));

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader
        title="Gallery"
        description={adminGreeting.context}
        aside={
          <button
            type="button"
            onClick={() =>
              setView((current) =>
                current === "albums" ? "approvals" : "albums",
              )
            }
            aria-pressed={view === "approvals"}
            className="shrink-0 rounded-[6px] text-body font-semibold leading-[1.45] text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {view === "albums" ? "Approvals" : "Albums"}
          </button>
        }
      />

      {view === "albums" ? (
        <>
          <Button
            type="button"
            className="h-[47px] w-[152px] shrink-0"
            onClick={() => void createAlbum()}
          >
            Create album
          </Button>

          {/* The selection filters. */}
          <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end md:gap-4">
            <AdminSearchField
              label="Search albums"
              value={query}
              onValueChange={setQuery}
              placeholder="Search albums…"
              className="md:w-[344px] md:shrink-0 xl:w-[560px]"
            />

            <AdminSelectField
              label="Category"
              options={ALBUM_CATEGORIES}
              value={category}
              onValueChange={setCategory}
              className="md:w-[344px] md:shrink-0 xl:w-[560px]"
            />
          </div>

          <PortalTable
            caption="Albums"
            columns={albumColumns}
            rows={albums}
            mobileRecords={albumRecords}
            mobileRecordSize="uniform"
          />

          {/* The album list is empty: the panel says so instead of leaving a
              bare table behind. */}
          {albums.length === 0 && !loading ? (
            <EmptyState
              message="No albums yet"
              title="Create an album, then add photos to it."
            />
          ) : null}

          {/* The list is on its way: the panel holds the rhythm Figma draws
              while the rows are loaded. */}
          {loading ? (
            <LoadingSkeleton
              message="Loading the albums"
              title="Fetching the albums…"
            />
          ) : null}

          {/* The media upload block. */}
          <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
            <p className="text-title font-bold leading-[1.45] text-ink">
              ↑ Drag photos here to upload
            </p>
            <p className="mt-4 text-caption leading-[1.45] text-muted">
              JPG, PNG · Maximum 10 MB per photo
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4 h-[49px] w-[166px]"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <Upload aria-hidden className="size-4" />
              Browse photos
            </Button>
          </section>

          <input
            ref={fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            className="sr-only"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);

              event.target.value = "";

              if (files.length === 0) return;

              void uploadPhotos(files);
            }}
          />
        </>
      ) : (
        <>
          <h3 className="text-title font-bold leading-[1.45] text-ink">
            Awaiting approval
          </h3>

          <PortalTable
            caption="Photos awaiting approval"
            columns={reviewColumns}
            rows={reviews}
            mobileRecords={reviewRecords}
            mobileRecordSize="uniform"
          />

          {/* The queue is empty: the panel says so instead of leaving a bare
              table behind. */}
          {reviews.length === 0 ? (
            <EmptyState
              message="Nothing to approve"
              title="Photos the teachers upload will appear here."
            />
          ) : null}
        </>
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
