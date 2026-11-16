/**
 * The settings of the school that are not in the database.
 *
 * The school can change these without a migration and without a deploy of the
 * code that holds the business rules, so they live in one file rather than in
 * the middle of a component.
 */

/**
 * The days of the week the school does not teach on.
 *
 * The numbers are the days of the week the way `Date.getUTCDay()` counts
 * them: 0 is Sunday and 6 is Saturday. The school is closed on Friday and on
 * Saturday, so the attendance calendar shows a dash on those days.
 *
 * This is a setting of the school and not a rule of the program: it should
 * become an Admin setting the school can change on its own, which is written
 * down in `docs/KNOWN_ISSUES.md`. Until then it is read from here, so there is
 * one place that holds it.
 */
export const WEEKLY_HOLIDAYS: readonly number[] = [5, 6];

/**
 * Whether a day of the week is a weekly holiday.
 *
 * @param weekday - The day of the week, 0 (Sunday) to 6 (Saturday).
 */
export function isWeeklyHoliday(weekday: number): boolean {
  return WEEKLY_HOLIDAYS.includes(weekday);
}
