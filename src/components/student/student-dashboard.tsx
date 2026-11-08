import { StudentPageHeader } from "@/components/student/student-page-header";
import { StudentWelcome } from "@/components/student/student-welcome";
import { StudentMetrics } from "@/components/student/student-metrics";
import { StudentAttendanceChart } from "@/components/student/student-attendance-chart";
import { StudentNoticeTable } from "@/components/student/student-notice-table";
import {
  attendanceTrend,
  studentGreeting,
  studentMetrics,
  studentNoticeRows,
} from "@/data/student";

/**
 * Student dashboard body.
 * Figma "Dashboard content" (2:3659 desktop, 2:3725 tablet, 2:3810 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px greeting, a 189px welcome panel,
 *   the 166px metric row, the 345px chart and the notices table.
 * - Tablet (768): 32px padding; the welcome panel and the metric row keep
 *   their heights.
 * - Mobile (375): 24px padding and a 111px greeting.
 *
 * The body is a twelve-column grid from tablet up, which is how Figma lays
 * the four metric cards on a single line. On mobile it is a plain stack, so
 * the two metric rows become blocks of their own.
 */
export function StudentDashboard() {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <StudentPageHeader
        title={studentGreeting.headline}
        description={studentGreeting.context}
      />

      <StudentWelcome />

      <StudentMetrics metrics={studentMetrics} />

      <StudentAttendanceChart points={attendanceTrend} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Recent notices
      </h3>

      <StudentNoticeTable rows={studentNoticeRows} />
    </div>
  );
}
