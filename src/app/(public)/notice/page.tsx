import type { Metadata } from "next";

import { PageIntroduction } from "@/components/shared/page-introduction";
import { NoticeBoard } from "@/components/notice/notice-board";

export const metadata: Metadata = {
  title: "Notice",
  description:
    "Important announcements, dates and updates for our students and guardians.",
};

/**
 * Public notice board.
 * Figma "Public / Notice" (light 2:1480 / 2:1587 / 2:1688 and the matching
 * dark frames): a page introduction followed by the filterable notice board.
 */
export default function NoticePage() {
  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  NOTICE"
        title="The school notice board."
        description="Important announcements, dates and updates for our community."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <NoticeBoard />
      </section>
    </>
  );
}
