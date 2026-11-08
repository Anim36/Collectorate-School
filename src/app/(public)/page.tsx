import type { Metadata } from "next";

import { GalleryPreview } from "@/components/home/gallery-preview";
import { HeadMessage } from "@/components/home/head-message";
import { Hero } from "@/components/home/hero";
import { QuickAccess } from "@/components/home/quick-access";
import { VisionMission } from "@/components/home/vision-mission";
import { WhatsHappening } from "@/components/home/whats-happening";

export const metadata: Metadata = {
  title: "Home",
};

/**
 * Public home page.
 * The utility bar, navbar and footer live in the `(public)` layout — this page
 * only supplies the content between them.
 */
export default function PublicHomePage() {
  return (
    <>
      <Hero />
      <WhatsHappening />
      <QuickAccess />
      <HeadMessage />
      <GalleryPreview />
      <VisionMission />
    </>
  );
}
