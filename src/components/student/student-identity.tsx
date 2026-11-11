import Image from "next/image";

import { cn } from "@/lib/utils";
import type { StudentProfile } from "@/types/student";

export interface StudentIdentityProps {
  /** The profile of the signed-in student. */
  profile: StudentProfile;
  className?: string;
}

/**
 * The identity card at the top of the profile page.
 * Figma "Student identity" (2:3936 desktop, 2:3989 tablet, 2:4061 mobile):
 * a 256px panel holding a 120px photograph, a 35px name and a 19px meta line.
 *
 * The photograph is a 120px rounded square, then the name 16px below it, then
 * the meta line 16px below the name.
 */
export function StudentIdentity({ profile, className }: StudentIdentityProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="relative size-[120px] shrink-0 overflow-hidden rounded-[12px] bg-tint"
      >
        <Image
          src={profile.photo}
          alt=""
          fill
          sizes="120px"
          className="object-cover"
        />
      </div>

      <h3 className="mt-4 text-title font-bold leading-[1.45] text-ink">
        {profile.name}
      </h3>
      <p className="mt-4 text-caption leading-[1.45] text-muted">
        {profile.studentId}
        {"  •  "}
        {profile.status}
      </p>
    </section>
  );
}
