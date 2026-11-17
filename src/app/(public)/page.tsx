import type { Metadata } from "next";

import { GalleryPreview } from "@/components/home/gallery-preview";
import { HeadMessage } from "@/components/home/head-message";
import { Hero } from "@/components/home/hero";
import { QuickAccess } from "@/components/home/quick-access";
import { VisionMission } from "@/components/home/vision-mission";
import { WhatsHappening } from "@/components/home/whats-happening";
import { getPublicHomeData } from "@/server/services/public-home";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Home",
  alternates: { canonical: "/" },
};

/**
 * Public home page.
 * The utility bar, navbar and footer live in the `(public)` layout — this
 * page only supplies the content between them.
 *
 * Every section that shows school data reads it from the database through
 * `getPublicHomeData()`, in four cached reads and no more.
 */
export default async function PublicHomePage() {
  const { notices, quickLinks, schoolStats, galleryMoments } =
    await getPublicHomeData();

  return (
    <>
      <Hero schoolStats={schoolStats} />
      <WhatsHappening notices={notices} />
      <QuickAccess links={quickLinks} />
      <HeadMessage />
      <GalleryPreview moments={galleryMoments} />
      <VisionMission />
    </>
  );
}
