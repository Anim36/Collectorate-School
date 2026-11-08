import type { Metadata } from "next";

import { HeadMessageCard } from "@/components/about/head-message-card";
import { ContentCard } from "@/components/shared/content-card";
import { PageIntroduction } from "@/components/shared/page-introduction";
import { PageSectionHeading } from "@/components/shared/page-section-heading";
import {
  aboutFacilities,
  aboutHeadMessageBody,
  aboutIntroduction,
  aboutTimeline,
  aboutVisionMission,
} from "@/data/public-pages";

export const metadata: Metadata = {
  title: "About",
  description:
    "Rooted in values. Ready for tomorrow. Discover our story, our people and the purpose that guides us.",
};

/**
 * Public about page.
 * Figma "Public / About" (light 2:1196 / 2:1293 / 2:1386 and the matching
 * dark frames): the page introduction, the milestones, vision and mission,
 * the facilities grid and the head of institution message.
 */
export default function AboutPage() {
  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  ABOUT"
        title="Rooted in values. Ready for tomorrow."
        description="Discover our story, our people and the purpose that guides us."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <PageSectionHeading title="Growing with our community" />

        <p className="mt-8 text-body leading-[1.45] text-muted">
          {aboutIntroduction}
        </p>

        <ul className="mt-8 grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-6 xl:grid-cols-3">
          {aboutTimeline.map((entry) => (
            <li key={entry.title} className="w-full">
              <ContentCard
                title={entry.title}
                description={entry.description}
              />
            </li>
          ))}
        </ul>

        <PageSectionHeading title="Vision & mission" className="mt-8" />

        <ul className="mt-8 grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-6">
          {aboutVisionMission.map((card) => (
            <li key={card.title} className="w-full">
              <ContentCard title={card.title} description={card.description} />
            </li>
          ))}
        </ul>

        <PageSectionHeading title="Facilities made for discovery" className="mt-8" />

        <ul className="mt-8 grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-6 xl:grid-cols-3">
          {aboutFacilities.map((facility) => (
            <li key={facility.title} className="w-full">
              <ContentCard
                title={facility.title}
                description={facility.description}
              />
            </li>
          ))}
        </ul>

        <div className="mt-8 w-full">
          <HeadMessageCard
            imageSrc="/images/head-of-institution.jpg"
            imageAlt="Portrait of Md. Anisur Rahman, Head of Institution"
            quote="“We help every child find their voice.”"
            attribution="Md. Anisur Rahman · Head of Institution"
            body={aboutHeadMessageBody}
          />
        </div>
      </section>
    </>
  );
}
