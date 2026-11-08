"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import {
  AdminSearchField,
  AdminSelectField,
} from "@/components/admin/admin-fields";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { PortalTable } from "@/components/shared/portal-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminGreeting } from "@/data/admin";
import {
  ADMIN_ALBUM_CATEGORIES,
  adminAlbums,
  adminPhotoReviews,
  type AdminAlbum,
  type AdminPhotoReview,
} from "@/data/admin-11b";

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
 * Everything happens in memory.
 */
export function AdminGallery() {
  const { toast } = useToast();

  const [view, setView] = React.useState<"albums" | "approvals">("albums");
  const [albums, setAlbums] = React.useState<readonly AdminAlbum[]>(adminAlbums);
  const [reviews, setReviews] = React.useState<readonly AdminPhotoReview[]>(
    adminPhotoReviews,
  );
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>(
    ADMIN_ALBUM_CATEGORIES[0],
  );

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Gallery");

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    return albums.filter((album) => {
      const matchesCategory =
        category === ADMIN_ALBUM_CATEGORIES[0] || album.category === category;
      if (!matchesCategory) return false;
      if (needle === "") return true;

      return album.title.toLowerCase().includes(needle);
    });
  }, [albums, query, category]);

  const createAlbum = () => {
    setAlbums((previous) => [
      ...previous,
      {
        id: `album-${previous.length + 1}`,
        title: `New album ${previous.length + 1}`,
        photoCount: 0,
        visibility: "Public",
        category: "Academic",
      },
    ]);

    toast({
      title: "Album created",
      description: "The new album is ready for its first photos.",
    });
  };

  const renameAlbum = (album: AdminAlbum) => {
    const title = window.prompt("Album name", album.title);
    if (!title || title === album.title) return;

    setAlbums((previous) =>
      previous.map((entry) =>
        entry.id === album.id ? { ...entry, title } : entry,
      ),
    );

    toast({
      title: "Album renamed",
      description: `The album is now called “${title}”.`,
    });
  };

  const reviewPhoto = (
    photo: AdminPhotoReview,
    state: AdminPhotoReview["state"],
  ) => {
    setReviews((previous) =>
      previous.map((entry) =>
        entry.id === photo.id ? { ...entry, state } : entry,
      ),
    );

    toast({
      title: state === "Approved" ? "Photo approved" : "Photo rejected",
      description:
        state === "Approved"
          ? `${photo.name} is now visible in the album.`
          : `${photo.name} was sent back to the teacher.`,
    });
  };

  const albumColumns = [
    { header: "Album", cell: (row: AdminAlbum) => row.title },
    { header: "Photos", cell: (row: AdminAlbum) => String(row.photoCount) },
    { header: "Visibility", cell: (row: AdminAlbum) => row.visibility },
    {
      header: "Actions",
      cell: (row: AdminAlbum) => (
        <span className="flex flex-wrap items-center gap-x-1">
          <RowAction onClick={() => renameAlbum(row)}>Edit</RowAction>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <RowAction onClick={createAlbum}>Add photos</RowAction>
        </span>
      ),
    },
  ];

  const albumRecords = filtered.map((row) => ({
    id: row.id,
    lines: [
      { label: "Album", value: row.title },
      { label: "Photos", value: String(row.photoCount) },
      { label: "Visibility", value: row.visibility },
      { label: "Actions", value: "Edit · Add photos" },
    ],
  }));

  const reviewColumns = [
    { header: "Photo", cell: (row: AdminPhotoReview) => row.name },
    { header: "Album", cell: (row: AdminPhotoReview) => row.album },
    { header: "Size", cell: (row: AdminPhotoReview) => row.size },
    {
      header: "Status",
      cell: (row: AdminPhotoReview) =>
        row.state === "Awaiting admin approval" ? (
          <Badge variant="warning">{row.state}</Badge>
        ) : (
          row.state
        ),
    },
    {
      header: "Actions",
      cell: (row: AdminPhotoReview) => (
        <span className="flex flex-wrap items-center gap-x-1">
          <RowAction onClick={() => reviewPhoto(row, "Approved")}>
            Approve
          </RowAction>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <RowAction onClick={() => reviewPhoto(row, "Rejected")}>
            Reject
          </RowAction>
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
            onClick={createAlbum}
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
              options={ADMIN_ALBUM_CATEGORIES}
              value={category}
              onValueChange={setCategory}
              className="md:w-[344px] md:shrink-0 xl:w-[560px]"
            />
          </div>

          <PortalTable
            caption="Albums"
            columns={albumColumns}
            rows={filtered}
            mobileRecords={albumRecords}
            mobileRecordSize="uniform"
          />

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
            >
              <Upload aria-hidden className="size-4" />
              Browse photos
            </Button>
          </section>
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
