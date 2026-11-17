import { TeacherMetrics } from "@/components/teacher/teacher-metrics";
import { TeacherPageHeader } from "@/components/teacher/teacher-page-header";
import {
  TeacherAttendanceTable,
  TeacherClassesTable,
  TeacherNoticesTable,
} from "@/components/teacher/teacher-tables";
import { TeacherWelcome } from "@/components/teacher/teacher-welcome";
import type { TeacherDashboardData } from "@/types/teacher";

export interface TeacherDashboardProps {
  /** The dashboard of the signed-in teacher, read from the database. */
  data: TeacherDashboardData;
}

/**
 * Teacher dashboard body.
 *
 * Figma "Dashboard content" (2:6387 desktop, 2:6544 tablet, 2:6706 mobile and
 * the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px greeting, a 189px teaching-plan
 *   panel, the 126px metric row, the 308px classes table, the 308px today's
 *   attendance table and the 248px notices table.
 * - Tablet (768): 32px padding; the blocks keep their heights.
 * - Mobile (375): 24px padding and a 111px greeting. The metric row becomes
 *   two rows of two cards, and each table row becomes a stacked record.
 *
 * The body is a twelve-column grid from tablet up, which is how Figma lays
 * the four metric cards on a single line. On mobile it is a plain stack, so
 * the two metric rows become blocks of their own.
 */
export function TeacherDashboard({ data }: TeacherDashboardProps) {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <TeacherPageHeader
        title={data.greeting.headline}
        description={data.greeting.context}
      />

      <TeacherWelcome welcome={data.welcome} />

      <TeacherMetrics metrics={data.metrics} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        My classes
      </h3>

      <TeacherClassesTable rows={data.classes} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Today’s attendance
      </h3>

      <TeacherAttendanceTable rows={data.attendance} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Recent notices
      </h3>

      <TeacherNoticesTable rows={data.notices} />
    </div>
  );
}
