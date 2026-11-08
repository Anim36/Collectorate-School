import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { AttachmentTable } from "@/components/notice/attachment-table";
import { NoticeArticle } from "@/components/notice/notice-article";
import { PageIntroduction } from "@/components/shared/page-introduction";
import { Button } from "@/components/ui/button";
import { formatLongNoticeDate, notices } from "@/data/notices";

interface NoticeDetailPageProps {
  /** Route parameter carrying the notice identifier. */
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: NoticeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const notice = notices.find((entry) => entry.id === id);

  if (!notice) {
    return { title: "Notice not found" };
  }

  return {
    title: notice.title,
    description: `${notice.category} notice published on ${notice.publishedLabel}.`,
  };
}

/**
 * Public notice detail page.
 * Figma "Public / Notice detail" (light 2:1786 / 2:1862 / 2:1932 and the
 * matching dark frames): the article, the attachment table, a download button
 * and a link back to the notice board.
 */
export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { id } = await params;
  const notice = notices.find((entry) => entry.id === id);

  if (!notice) {
    notFound();
  }

  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  NOTICE DETAIL"
        title={notice.title}
        description={`${notice.category}  •  Published ${formatLongNoticeDate(notice.publishedOn)}`}
        className="[&>p:last-child]:max-w-[260px] md:[&>p:last-child]:max-w-none"
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <NoticeArticle notice={notice} className="w-full" />

        <h2 className="mt-8 text-title font-bold leading-[1.45] text-ink">
          Attachments
        </h2>

        <AttachmentTable
          attachments={notice.attachments}
          caption={`Attachments for ${notice.title}`}
          className="mt-8 w-full"
        />

        <div className="mt-8 flex w-full flex-col items-start gap-8">
          <Button type="button" variant="default">
            <Download aria-hidden className="size-4" />
            Download attachments
          </Button>

          <Button asChild variant="secondary">
            <Link href="/notice">
              <ArrowLeft aria-hidden className="size-4" />
              Back to notices
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
