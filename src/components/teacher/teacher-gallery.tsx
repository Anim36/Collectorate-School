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
import { teacherGreeting } from "@/data/teacher";
import {
  teacherAlbumPreview,
  teacherGalleryAlbums,
  teacherGalleryIntro,
  teacherUploadArea,
  teacherUploads,
  type TeacherUpload,
} from "@/data/teacher-gallery";

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
 * The upload area is a UI only: the teacher picks files and they are staged in
 * the table as "Awaiting admin approval". Nothing is sent to a server.
 */
export function TeacherGallery() {
  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Gallery upload");

  const [album, setAlbum] = React.useState(teacherGalleryAlbums[0]);
  const [uploads, setUploads] = React.useState<readonly TeacherUpload[]>(
    teacherUploads,
  );
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const stageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const staged = Array.from(files).map(
      (file, index): TeacherUpload => ({
        id: `upload-${file.name}-${index}`,
        name: file.name,
        size: formatFileSize(file.size),
        status: "Awaiting admin approval",
        preview: "/images/science-fair.jpg",
        previewAlt: "Preview of the photo waiting for approval",
      }),
    );

    setUploads((previous) => [...previous, ...staged]);
  };

  const columns = [
    { header: "Photo", cell: (upload: TeacherUpload) => upload.name },
    { header: "Size", cell: (upload: TeacherUpload) => upload.size },
    {
      header: "Upload status",
      cell: (upload: TeacherUpload) =>
        upload.status === "Awaiting admin approval" ? (
          <Badge variant="warning">{upload.status}</Badge>
        ) : (
          upload.status
        ),
    },
  ];

  const mobileRecords = uploads.map((upload) => ({
    id: upload.id,
    lines: [
      { label: "Photo", value: upload.name },
      { label: "Size", value: upload.size },
      { label: "Upload status", value: upload.status },
    ],
  }));

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <TeacherPageHeader
        title="Gallery upload"
        description={teacherGreeting.context}
      />

      <p className="text-title font-bold leading-[1.45] text-ink">
        {teacherGalleryIntro}
      </p>

      <div className="flex w-full flex-col items-start">
        <FilterField
          label="Album"
          options={teacherGalleryAlbums}
          value={album}
          onValueChange={setAlbum}
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
          {teacherUploadArea.title}
        </p>

        <p className="mt-4 text-caption leading-[1.45] text-muted">
          {teacherUploadArea.body}
        </p>

        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 h-[49px] w-[166px] px-0"
        >
          {teacherUploadArea.actionLabel}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          aria-label="Choose photographs to upload"
          className="sr-only"
          onChange={(event) => stageFiles(event.target.files)}
        />
      </section>

      <PortalTable
        caption="Staged uploads"
        columns={columns}
        rows={uploads}
        mobileRecords={mobileRecords}
        mobileRecordSize="uniform"
      />

      <Button
        type="button"
        disabled={uploads.length === 0}
        className="h-[47px] w-[175px] px-0"
      >
        <Upload aria-hidden className="size-4" />
        Upload {uploads.length} photo{uploads.length === 1 ? "" : "s"}
      </Button>

      {/* The album preview. */}
      <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-[25px]">
        <Image
          src="/images/science-fair.jpg"
          alt="Students presenting a project at the science fair"
          width={1088}
          height={280}
          className="h-[200px] w-full rounded-[12px] object-cover md:h-[280px]"
        />
        <p className="mt-4 text-title font-bold leading-[29px] text-ink">
          {teacherAlbumPreview}
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
