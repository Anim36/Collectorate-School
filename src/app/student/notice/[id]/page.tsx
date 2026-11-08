import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { AttachmentTable } from "@/components/notice/attachment-table";
import { NoticeArticle } from "@/components/notice/notice-article";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { Button } from "@/components/ui/button";
import { formatLongNoticeDate, findStudentNotice } from "@/data/notices";

interface StudentNoticeDetailPageProps {
  /** Route parameter carrying the notice identifier. */
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: StudentNoticeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const notice = findStudentNotice(id);

  if (!notice) {
    return { title: "Notice not found" };
  }

  return {
    title: notice.title,
    description: `${notice.category} notice published on ${notice.publishedLabel}.`,
  };
}

/**
 * Student notice detail page.
 *
 * Figma has no student notice detail frame of its own, so the page reuses the
 * public notice detail layout (light 2:1786 / 2:1862 / 2:1932): the article,
 * the attachment table, a download button and a link back to the board. Only
 * the surrounding chrome changes — the portal shell instead of the public
 * navbar and footer.
 */
export default async function StudentNoticeDetailPage({
  params,
}: StudentNoticeDetailPageProps) {
  const { id } = await params;
  const notice = findStudentNotice(id);

  if (!notice) {
    notFound();
  }

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <StudentPageHeader
        title={notice.title}
        description={`${notice.category}  •  Published ${formatLongNoticeDate(notice.publishedOn)}`}
      />

      <NoticeArticle notice={notice} className="w-full" />

      <h2 className="text-title font-bold leading-[1.45] text-ink">
        Attachments
      </h2>

      <AttachmentTable
        attachments={notice.attachments}
        caption={`Attachments for ${notice.title}`}
        className="w-full"
      />

      <div className="flex w-full flex-col items-start gap-6">
        <Button type="button" className="h-[47px] w-[228px] px-0">
          <Download aria-hidden className="size-4" />
          Download attachments
        </Button>

        <Button asChild variant="secondary" className="h-[49px] w-[169px] px-0">
          <Link href="/student/notice">
            <ArrowLeft aria-hidden className="size-4" />
            Back to notices
          </Link>
        </Button>
      </div>
    </div>
  );
}
