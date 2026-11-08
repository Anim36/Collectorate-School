"use client";

import Link from "next/link";
import * as React from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeading } from "@/components/home/section-heading";
import {
  homeNotices,
  noticeCategories,
  type HomeNotice,
  type NoticeCategory,
} from "@/data/home";

function NoticeCard({ notice }: { notice: HomeNotice }) {
  return (
    <article className="flex w-full flex-col items-start gap-4 rounded-[12px] border border-border bg-surface p-6">
      <p className="text-caption font-medium leading-[1.45] text-muted">
        {notice.date}
      </p>
      <p className="text-caption font-bold leading-[1.45] text-primary">
        {notice.category}
      </p>
      <h3 className="text-body-lg font-semibold leading-[1.45] text-ink">
        {notice.title}
      </h3>
      <p className="text-body leading-[1.45] text-muted">{notice.description}</p>
      <Link
        href={notice.href}
        className="text-caption font-semibold leading-[1.45] text-primary"
      >
        Read notice →
      </Link>
    </article>
  );
}

function NoticeGrid({ notices }: { notices: readonly HomeNotice[] }) {
  if (notices.length === 0) {
    return (
      <EmptyState
        message="Nothing here yet"
        title="New notices will appear here."
      />
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {notices.map((notice) => (
        <NoticeCard key={notice.title} notice={notice} />
      ))}
    </div>
  );
}

/**
 * "What's Happening" section.
 * Figma "What's happening" (2:170 desktop, 2:180 tablet, 2:190 mobile): an
 * eyebrow, a heading, a 16px lead, the category tab row and the notice cards
 * laid out four-up on desktop, two-up on tablet and stacked on mobile. The
 * "Notices" tab carries the full list, which is what the Figma frames show.
 */
export function WhatsHappening() {
  const noticesByCategory = React.useMemo(() => {
    const grouped = new Map<NoticeCategory, HomeNotice[]>();
    for (const category of noticeCategories) grouped.set(category, []);
    for (const notice of homeNotices) {
      for (const category of notice.tabs) {
        grouped.get(category)?.push(notice);
      }
    }
    return grouped;
  }, []);

  return (
    <section className="flex w-full flex-col items-start gap-6 bg-background px-6 py-10 md:px-8 md:py-16 xl:px-20">
      <SectionHeading
        eyebrow="THE LATEST ON CAMPUS"
        title="What’s Happening"
        description="Stay connected with the moments and milestones of school life."
      />

      <Tabs defaultValue="Notices" className="w-full">
        <TabsList className="w-full gap-4 overflow-x-auto p-0 md:gap-8">
          {noticeCategories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="text-body font-medium leading-[1.45]"
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {noticeCategories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6 w-full">
            <NoticeGrid notices={noticesByCategory.get(category) ?? []} />
          </TabsContent>
        ))}
      </Tabs>

      <Link
        href="/notice"
        className="text-body font-semibold leading-[1.45] text-primary"
      >
        View All notices →
      </Link>
    </section>
  );
}
