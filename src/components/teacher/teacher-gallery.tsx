"use client";

import Image from "next/image";
import * as React from "react";
import { Upload } from "lucide-react";

import { FilterField } from "@/components/shared/filter-field";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { TeacherPageHeader } from "@/components/teacher/teacher-page-header";
import { PortalTable } from "@/components/shared/portal-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { encodeFile } from "@/lib/file-transfer";
import {
  loadTeacherGalleryAction,
  uploadTeacherPhotosAction,
} from "@/app/teacher/actions";
import type { TeacherGalleryData, TeacherUploadRow } from "@/types/teacher";

/**
 * The teacher gallery upload page.
 *
 * Figma "Teacher / Gallery upload" (light 2:9116 desktop, 2:9270 tablet,
 * 2:9392 mobile and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 35px intro line, the
 *   76px album selector, the 259px drop area, the 248px uploads table, the
 *   47px upload button and the 375px album preview.
 * - Tablet (768): the same rhythm with a 560px album selector.
 * - Mobile (375): 24px padding, a 313px drop area, a 253px table and a 324px
 *   album preview.
 *
 * The photographs the teacher picks are written to the database and wait for
 * the admin, so they are not in the album until the admin approves them.
 */
export function TeacherGallery({ initial }: { initial: TeacherGalleryData }) {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Gallery upload");

  const [albumId, setAlbumId] = React.useState(initial.albumId);
  const [albums, setAlbums] = React.useState(initial.albums);
  const [uploads, setUploads] = React.useState<readonly TeacherUploadRow[]>(
    initial.uploads,
  );
  const [preview, setPreview] = React.useState(initial.preview);
  const [previewAlt, setPreviewAlt] = React.useState(initial.previewAlt);
  const [photoCount, setPhotoCount] = React.useState(initial.photoCount);
  const [albumTitle, setAlbumTitle] = React.useState(initial.albumTitle);
  const [staged, setStaged] = React.useState<
    readonly { name: string; size: string; file: File }[]
  >([]);
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Reads the gallery from the server for the album that is open.
   */
  const load = React.useCallback(
    async (nextAlbumId: string) => {
      const result = await loadTeacherGalleryAction({ albumId: nextAlbumId });

      if (!result.ok) {
        toast({
          title: "Could not load the gallery",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setAlbums(result.data.albums);
      setUploads(result.data.uploads);
      setPreview(result.data.preview);
      setPreviewAlt(result.data.previewAlt);
      setPhotoCount(result.data.photoCount);
      setAlbumTitle(result.data.albumTitle);
    },
    [toast],
  );

  /**
   * Stages the files the teacher picked.
   *
   * They are staged in the browser first, so the table shows them before
   * anything is written to the database.
   */
  const stageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const picked = Array.from(files).map((file) => ({
      name: file.name,
      size: formatFileSize(file.size),
      file,
    }));

    setStaged((previous) => [...previous, ...picked]);
  };

  /**
   * Uploads the staged photographs into the album.
   *
   * The server writes them as waiting for the admin, so they only appear in
   * the album once the admin has approved them.
   */
  const upload = async () => {
    if (staged.length === 0) return;

    setBusy(true);

    const payloads = await Promise.all(staged.map((entry) => encodeFile(entry.file)));

    const result = await uploadTeacherPhotosAction({
      albumId,
      files: payloads.map((payload) => ({
        name: payload.name,
        base64: payload.base64,
      })),
    });

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Photos not uploaded",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setStaged([]);
    await load(albumId);

    toast({
      title: "Photos uploaded",
      description: `${result.data.uploaded} photo(s) are waiting for the admin.`,
    });
  };

  const columns = [
    { header: "Photo", cell: (upload: TeacherUploadRow) => upload.name },
    { header: "Size", cell: (upload: TeacherUploadRow) => upload.size },
    {
      header: "Upload status",
      cell: (upload: TeacherUploadRow) =>
        upload.status === "Awaiting admin approval" ? (
          <Badge variant="warning">{upload.status}</Badge>
        ) : (
          upload.status
        ),
    },
  ];

  // The staged photographs sit above the ones the database holds, so the table
  // shows what is about to be sent.
  const rows: readonly TeacherUploadRow[] = [
    ...staged.map((entry, index) => ({
      id: `staged-${index}-${entry.name}`,
      name: entry.name,
      size: entry.size,
      status: "Awaiting admin approval" as const,
      album: albumTitle,
      preview: "",
      previewAlt: entry.name,
    })),
    ...uploads,
  ];

  const mobileRecords = rows.map((upload) => ({
    id: upload.id,
    lines: [
      { label: "Photo", value: upload.name },
      { label: "Size", value: upload.size },
      { label: "Upload status", value: upload.status },
    ],
  }));

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <TeacherPageHeader title="Gallery upload" description={initial.context} />

      <p className="text-title font-bold leading-[1.45] text-ink">
        Share a school memory
      </p>

      <div className="flex w-full flex-col items-start">
        <FilterField
          label="Album"
          options={albums.map((album) => album.title)}
          value={albumTitle}
          onValueChange={(value) => {
            const next = albums.find((album) => album.title === value);
            if (!next) return;

            setAlbumId(next.id);
            void load(next.id);
          }}
          className="md:w-[560px]"
        />
      </div>

      {/* The drop area. */}
      <section
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          stageFiles(event.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6 transition-colors ${
          dragging ? "border-primary bg-tint" : ""
        }`}
      >
        <span
          aria-hidden
          className="flex h-[58px] w-full items-center justify-center text-title font-bold leading-[1.45] text-muted"
        >
          ↑
        </span>

        <p className="mt-4 text-title font-bold leading-[1.45] text-ink">
          Drag and drop your photos here
        </p>

        <p className="mt-4 text-caption leading-[1.45] text-muted">
          or browse from your device · JPG, PNG · Up to 10 MB each
        </p>

        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 h-[49px] w-[166px] px-0"
        >
          Browse photos
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          aria-label="Choose photographs to upload"
          className="sr-only"
          onChange={(event) => {
            stageFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </section>

      <PortalTable
        caption="Staged uploads"
        columns={columns}
        rows={rows}
        mobileRecords={mobileRecords}
        mobileRecordSize="uniform"
      />

      <Button
        type="button"
        disabled={staged.length === 0 || busy}
        onClick={() => void upload()}
        className="h-[47px] w-[175px] px-0"
      >
        <Upload aria-hidden className="size-4" />
        Upload {staged.length} photo{staged.length === 1 ? "" : "s"}
      </Button>

      {/* The album preview. */}
      <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-[25px]">
        <Image
          src={preview}
          alt={previewAlt}
          width={1088}
          height={280}
          className="h-[200px] w-full rounded-[12px] object-cover md:h-[280px]"
        />
        <p className="mt-4 text-title font-bold leading-[29px] text-ink">
          {albumTitle} · {photoCount} photos
        </p>
      </section>
    </div>
  );
}

/** Formats a file size the way the uploads table shows it, e.g. "2.4 MB". */
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    const kilobytes = bytes / 1024;
    return `${kilobytes < 10 ? kilobytes.toFixed(1) : Math.round(kilobytes)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
