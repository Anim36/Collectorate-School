import { cn } from "@/lib/utils";
import type { StudentProfile } from "@/types/student";

export interface StudentDetailFieldProps {
  /** Field label, e.g. "Class / Section". */
  label: string;
  /** Field value, e.g. "Class 9 / A". */
  value: string;
  className?: string;
}

/**
 * One profile detail field.
 * Figma "Class / Section value" (2:3943 desktop, 2:3996 tablet, 2:4068
 * mobile): a 19px label above a 49px value box that holds a 23px line with a
 * 25px inset.
 */
export function StudentDetailField({
  label,
  value,
  className,
}: StudentDetailFieldProps) {
  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <p className="text-caption leading-[1.45] text-muted">{label}</p>
      <div className="mt-2 flex h-[49px] w-full items-center rounded-[12px] border border-border bg-surface px-6">
        <p className="text-body leading-[1.45] text-ink">{value}</p>
      </div>
    </div>
  );
}

/**
 * The profile detail grid.
 * Figma "Profile details" (2:3940, 2:3949, 2:3958 and 2:3967 on desktop;
 * 2:3993, 2:4002, 2:4011 and 2:4020 on tablet; 2:4065–2:4100 on mobile).
 *
 * - Desktop and tablet: two fields per row — 560px wide from 1440 and 344px
 *   wide from 768 — with the rows 24px apart.
 * - Mobile (375): one field per row, 24px apart.
 *
 * Figma draws every row as its own frame, so the grid is not wrapped in a
 * box of its own: the rows sit directly in the page body.
 */
export function StudentProfileDetails({
  profile,
  className,
}: {
  /** The profile of the signed-in student. */
  profile: StudentProfile;
  className?: string;
}) {
  const fields: readonly { label: string; value: string }[] = [
    {
      label: "Class / Section",
      value: `${profile.className} / ${profile.sectionName}`,
    },
    { label: "Roll number", value: profile.roll },
    { label: "Date of birth", value: profile.dateOfBirth },
    { label: "Guardian", value: profile.guardian },
    { label: "Guardian phone", value: profile.guardianPhone },
    { label: "Email", value: profile.email },
    { label: "Address", value: profile.address },
    { label: "Emergency contact", value: profile.emergencyContact },
  ];

  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2",
        className,
      )}
    >
      {fields.map((field) => (
        <StudentDetailField
          key={field.label}
          label={field.label}
          value={field.value}
        />
      ))}
    </div>
  );
}
