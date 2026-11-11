import { MarksOverTimeChart } from "@/components/student/marks-over-time-chart";
import { StudentMetrics } from "@/components/student/student-metrics";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { SubjectMarkBars } from "@/components/student/subject-mark-bars";
import { cn } from "@/lib/utils";
import type { StudentPerformanceData } from "@/types/student";

export interface StudentPerformanceProps {
  /** The performance of the signed-in student, read from the database. */
  data: StudentPerformanceData;
  className?: string;
}

/**
 * Student performance page body.
 * Figma "Performance content" (2:4666 desktop, 2:4735 tablet, 2:4823 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px greeting, the 166px metric row, the
 *   345px marks chart, the subject heading, the 506px subject bars and the
 *   two 118px note cards.
 * - Tablet (768): 32px padding; every block keeps its height.
 * - Mobile (375): 24px padding, an 88px greeting, the metric row in two
 *   blocks of two and 141px note cards whose copy wraps to two lines.
 */
export function StudentPerformance({
  data,
  className,
}: StudentPerformanceProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <StudentPageHeader
        title="Performance"
        description="Your school life, clearly organised."
      />

      <StudentMetrics metrics={data.metrics} />

      <MarksOverTimeChart points={data.trend} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Subject-wise performance
      </h3>

      <SubjectMarkBars marks={data.marks} />

      <PerformanceNote
        title={data.notes.strength.title}
        body={data.notes.strength.body}
      />

      <PerformanceNote
        title={data.notes.growth.title}
        body={data.notes.growth.body}
      />
    </div>
  );
}

interface PerformanceNoteProps {
  /** Heading of the note. */
  title: string;
  /** Copy under the heading. */
  body: string;
}

/**
 * The strength and room-to-grow notes.
 * Figma "Your strength" (2:4722 desktop, 2:4791 tablet, 2:4880 mobile):
 * a bordered card with a 29px title and a 23px body line, 16px below it.
 */
function PerformanceNote({ title, body }: PerformanceNoteProps) {
  return (
    <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
      <h3 className="text-body-lg font-semibold leading-[1.45] text-ink">
        {title}
      </h3>
      <p className="mt-4 text-body leading-[1.45] text-muted">{body}</p>
    </section>
  );
}
