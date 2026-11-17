import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { FeeTable } from "@/components/admission/fee-table";
import { InfoCard } from "@/components/admission/info-card";
import { StepCard } from "@/components/admission/step-card";
import { PageIntroduction } from "@/components/shared/page-introduction";
import { PageSectionHeading } from "@/components/shared/page-section-heading";
import {
  admissionFeeNote,
  admissionInfoCards,
  admissionSteps,
} from "@/content/admission";
import { listPublicFees } from "@/server/services/public-fees";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Admission",
  description:
    "A simple, transparent path to joining our school community — steps, documents, dates and fees.",
  alternates: { canonical: "/admission" },
};

/**
 * Public admission page.
 * Figma "Public / Admission" (light 2:640 / 2:736 / 2:827 and the matching
 * dark frames): a page introduction, the four-step journey, the "Before you
 * apply" cards, the fee table and the form download call to action.
 *
 * The Figma frame spaces every block 32px apart and reserves 80px between
 * the section headings and the block they introduce.
 *
 * The journey, the documents and the dates are the school's own words, kept
 * in `src/content/admission.ts`. The fee table is the one part that reads
 * its rows from the database: the fee structure of every class the school
 * teaches, for the current academic year, formatted in taka.
 */
export default async function AdmissionPage() {
  const feeRows = await listPublicFees();

  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  ADMISSION"
        title="Your next chapter starts here."
        description="A simple, transparent path to joining our school community."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <PageSectionHeading title="A clear path to a bright future" />

        {/* Four journey steps — one per row on mobile, four across on desktop. */}
        <ul className="mt-8 grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-6 md:gap-y-8 xl:grid-cols-4">
          {admissionSteps.map((step) => (
            <li key={step.title} className="w-full">
              <StepCard title={step.title} description={step.description} />
            </li>
          ))}
        </ul>

        <PageSectionHeading title="Before you apply" id="apply" className="mt-8" />

        <ul className="mt-8 grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-6">
          {admissionInfoCards.map((card) => (
            <li key={card.title} className="w-full">
              <InfoCard title={card.title} items={card.items} />
            </li>
          ))}
        </ul>

        <PageSectionHeading title="Fees at a glance" id="fees" className="mt-8" />

        <div className="mt-8 w-full">
          <FeeTable
            rows={feeRows}
            caption="Admission fees for every class, in the current academic year"
          />
        </div>

        <p className="mt-8 text-caption leading-[1.45] text-muted">
          {admissionFeeNote}
        </p>

        <Link
          href="/admission#apply"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-[12px] bg-action px-6 py-3 text-body font-semibold leading-[1.45] text-white transition-colors hover:bg-action/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Download aria-hidden className="size-4" />
          Download Form
        </Link>
      </section>
    </>
  );
}
