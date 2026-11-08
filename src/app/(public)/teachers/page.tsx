import type { Metadata } from "next";

import { PageIntroduction } from "@/components/shared/page-introduction";
import { StaffDirectory } from "@/components/teachers/staff-directory";

export const metadata: Metadata = {
  title: "Teachers & Staff",
  description:
    "Dedicated educators. Caring mentors. A shared love of learning — meet our teachers and staff.",
};

/**
 * Public teachers and staff page.
 * Figma "Public / Teachers & Staff" (light 2:916 / 2:1013 / 2:1105 and the
 * matching dark frames): a page introduction followed by the searchable staff
 * directory.
 */
export default function TeachersPage() {
  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  TEACHERS & STAFF"
        title="Meet the people who inspire."
        description="Dedicated educators. Caring mentors. A shared love of learning."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <StaffDirectory />
      </section>
    </>
  );
}
