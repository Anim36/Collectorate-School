import { Button } from "@/components/ui/button";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { StudentIdentity } from "@/components/student/student-identity";
import { StudentProfileDetails } from "@/components/student/student-profile-details";
import { cn } from "@/lib/utils";
import type { StudentProfile } from "@/types/student";

export interface StudentProfileCardProps {
  /** The profile of the signed-in student, read from the database. */
  profile: StudentProfile;
  className?: string;
}

/**
 * Student profile page body.
 * Figma "My Profile content" (2:3933 desktop, 2:3986 tablet, 2:4058 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px greeting, the 256px identity card,
 *   four 76px detail rows 24px apart, the 47px edit button and the note.
 * - Tablet (768): 32px padding; the detail rows stay 76px tall.
 * - Mobile (375): 24px padding, a 111px greeting and eight single-field
 *   rows.
 */
export function StudentProfileCard({
  profile,
  className,
}: StudentProfileCardProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <StudentPageHeader
        title="My Profile"
        description="Your school life, clearly organised."
      />

      <StudentIdentity profile={profile} />

      <StudentProfileDetails profile={profile} />

      <Button type="button" className="h-[47px] w-[200px] px-0">
        Request profile edit
      </Button>

      <p className="text-caption leading-[1.45] text-muted">
        Your school admin reviews all profile change requests before they take
        effect.
      </p>
    </div>
  );
}
