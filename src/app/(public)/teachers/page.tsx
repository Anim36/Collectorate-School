import type { Metadata } from "next";

import { PageIntroduction } from "@/components/shared/page-introduction";
import { StaffDirectory } from "@/components/teachers/staff-directory";
import {
  listPublicStaff,
  listPublicStaffSubjects,
} from "@/server/services/public-staff";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Teachers & Staff",
  description:
    "Dedicated educators. Caring mentors. A shared love of learning — meet our teachers and staff.",
  alternates: { canonical: "/teachers" },
};

/**
 * Public teachers and staff page.
 * Figma "Public / Teachers & Staff" (light 2:916 / 2:1013 / 2:1105 and the
 * matching dark frames): a page introduction followed by the searchable staff
 * directory.
 *
 * The directory reads the `staff` table, and the service passes only the
 * name, the designation line, the subject and the portrait of every member:
 * no email, no phone, nothing private, until the school decides to publish
 * it.
 */
export default async function TeachersPage() {
  const [members, subjects] = await Promise.all([
    listPublicStaff(),
    listPublicStaffSubjects(),
  ]);

  return (
    <>
      <PageIntroduction
        eyebrow="HOME  /  TEACHERS & STAFF"
        title="Meet the people who inspire."
        description="Dedicated educators. Caring mentors. A shared love of learning."
      />

      <section className="flex w-full flex-col items-start px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20">
        <StaffDirectory members={members} subjects={subjects} />
      </section>
    </>
  );
}
