# Backend handoff

The app runs entirely on the mock data in `src/data`. This document names the
table each mock file becomes, and every place where a change lives only in the
browser's memory, together with the API endpoint it will need.

The endpoints below use the REST shape the rest of the app already implies:

```
GET    /api/<resource>
GET    /api/<resource>/:id
POST   /api/<resource>
PATCH  /api/<resource>/:id
DELETE /api/<resource>/:id
```

`{id}` is the id the mock data already uses, so the ids do not have to change
when the backend arrives.

---

## 1. The mock data files and the tables they become

| Mock file | Backend table | Notes |
| --- | --- | --- |
| `src/data/admin.ts` | `users`, `classes`, `class_subjects` | `adminUsers` → `users`; `adminClasses` / `adminClassRows` → `classes`; `adminSubjectAllocations` → `class_subjects`. `adminDepartments`, `adminSubjects` and `adminTeachers` are reference lists. |
| `src/data/admin-11b.ts` | `notices`, `notice_attachments`, `gallery_albums`, `gallery_photos`, `routines`, `routine_periods`, `calendar_events` | `adminNotices` → `notices`; `adminAlbums` → `gallery_albums`; `adminPhotoReviews` → `gallery_photos`; `adminRoutine` → `routines` + `routine_periods`; `adminCalendarRows` → `calendar_events`. |
| `src/data/admin-11c.ts` | `payments`, `receipts`, `fee_structure`, `audit_log` | `adminPayments` → `payments`; `adminFeeStructure` → `fee_structure`; `adminAuditEvents` → `audit_log`. The receipt prefix and the invoice prefix become sequence settings, not columns. |
| `src/data/calendar.ts` | `calendar_events` | The public calendar reads the same `calendar_events` table as the admin calendar, filtered by `audience`. |
| `src/data/components.ts` | — | Demo fixtures for the design-system page only. Not a table; keep it in the app or drop it with the page. |
| `src/data/design-tokens.ts` | — | The design tokens. Not a table; they belong in the design system, not the database. |
| `src/data/gallery.ts` | `gallery_albums`, `gallery_photos` | The public gallery reads the same tables as the admin gallery. |
| `src/data/home.ts` | `notices`, `gallery_albums`, `quick_links`, `school_stats` | `homeNotices` → a filtered read of `notices`; `galleryMoments` → `gallery_photos`; `quickLinks` → `quick_links`; `schoolStats` → `school_stats`. |
| `src/data/navigation.ts` | `navigation_items` | The public navbar. `navItems` → `navigation_items`; the dropdown children become rows of the same table. |
| `src/data/notices.ts` | `notices`, `notice_attachments` | The public and the student notice board read the same table. |
| `src/data/photos.ts` | — | The list of the photographs in `/public/images`. Becomes a media record once uploads are real; until then it stays a static list. |
| `src/data/portal-navigation.ts` | `portal_nav_items` | The sidebar and the bottom tab bar of each role. The role is a column, not a separate table. |
| `src/data/public-pages.ts` | `admission_steps`, `fee_structure`, `staff`, `about_content` | `admissionSteps` → `admission_steps`; `admissionFeeRows` → `fee_structure`; `staffMembers` → `staff`; `aboutTimeline` and the `about*` copy → `about_content`. |
| `src/data/routine.ts` | `routines`, `routine_periods`, `classes` | The public routine reads the same `routines` table as the admin routine. |
| `src/data/student.ts` | `students`, `attendance`, `exam_results`, `fees`, `payments`, `receipts` | `studentProfile` → `students`; `attendanceMonths` → `attendance`; `examResults` → `exam_results`; `dueFees` → `fees`; `paymentHistory` → `payments`; the receipt list → `receipts`. |
| `src/data/teacher-gallery.ts` | `gallery_photos`, `gallery_albums` | `teacherUploads` → `gallery_photos` with `status = 'awaiting_approval'`; `teacherGalleryAlbums` → `gallery_albums`. |
| `src/data/teacher-notices.ts` | `notices` | The teacher notice board reads the same `notices` table, filtered by `audience`. |
| `src/data/teacher-results.ts` | `exam_results`, `exams`, `result_sheets` | `teacherExams` → `exams`; `teacherResultSheets` → `result_sheets`; the marks inside a sheet → `exam_results`. |
| `src/data/teacher.ts` | `teachers`, `classes`, `students`, `attendance` | `teacherProfile` → `teachers`; `teacherClasses` → `classes`; `teacherRolls` → `students`; `teacherAttendanceSheets` → `attendance`. |

### The tables the mock data implies
These tables exist today. The schema is `prisma/schema.prisma`; the column
names below are the ones the schema uses.

#### The school structure

The database holds the real school, not the shape the mock data assumes.

| | |
| --- | --- |
| Classes | Nursery, KG, Class 1 … Class 10 — twelve classes, ordered by `sort_order` (0 for Nursery, 11 for Class 10) |
| Sections | One per class, named "Default" and flagged `is_default`. There are no A/B/C sections, no boy/girl split and no shifts. |
| Grading | `grading_mode` is `GPA` for Class 1 to Class 10 and `GRADE_ONLY` for Nursery and KG. A `GRADE_ONLY` class publishes a letter grade and no grade point. |
| Roll numbers | Unique inside the class, not inside the section (`unique(class_id, roll, academic_year_id)`). |
| Fees | `fee_structure` is recorded per class, not per band, because the school runs from Nursery to Class 10 and the bands are not numeric. |

The mock data only covers Classes 6 to 10 and splits them into the sections
A, B and C. The seed merges the students of every section of a class into that
class's one section and renumbers the rolls, so the roll of a class runs from 1
without gaps.

#### The tables

| Table | Columns it holds |
| --- | --- |
| `users` | `id`, `login_id`, `name`, `email`, `password_hash`, `role`, `class_or_department`, `is_active`, `must_change_password`, `failed_login_count`, `locked_until`, `last_login_at`, `created_at`, `updated_at` |
| `academic_years` | `id`, `name`, `start_date`, `end_date`, `is_current`, `created_at` |
| `classes` | `id`, `name`, `sort_order`, `grading_mode`, `academic_year_id` |
| `sections` | `id`, `class_id`, `name`, `is_default`, `class_teacher_id` |
| `subjects` | `id`, `name`, `code` |
| `class_subjects` | `id`, `class_id`, `subject_id`, `teacher_id` |
| `students` | `id`, `user_id`, `student_id`, `name`, `class_id`, `section_id`, `academic_year_id`, `roll`, `guardian_name`, `guardian_phone`, `phone`, `emergency_contact`, `email`, `address`, `photo_url`, `date_of_birth` |
| `teachers` | `id`, `user_id`, `designation`, `department`, `subject`, `phone`, `photo_url` |
| `staff` | `id`, `name`, `designation`, `subject`, `department`, `staff_type`, `email`, `photo_url`, `photo_width`, `photo_height`, `position` |
| `attendance` | `id`, `student_id`, `section_id`, `date`, `status`, `marked_by_id`, `marked_at` |
| `attendance_sheets` | `id`, `section_id`, `date`, `marked_by_id`, `saved_at` |
| `exams` | `id`, `name`, `year`, `term`, `published`, `academic_year_id`, `created_at` |
| `result_sheets` | `id`, `exam_id`, `class_id`, `section_id`, `subject_id`, `status`, `saved_at`, `published_at`, `entered_by_id` |
| `exam_results` | `id`, `exam_id`, `student_id`, `subject_id`, `result_sheet_id`, `marks`, `grade`, `gpa`, `status`, `entered_by_id` |
| `fees` | `id`, `student_id`, `fee_structure_id`, `label`, `amount_poisha`, `due_date`, `status`, `invoice_no`, `paid_at` |
| `fee_structure` | `id`, `class_id`, `academic_year_id`, `monthly_tuition_poisha`, `admission_fee_poisha`, `activities_poisha`, `due_date` |
| `payments` | `id`, `student_id`, `amount_poisha`, `method`, `transaction_id`, `card_last4`, `status`, `paid_at`, `recorded_by_id` |
| `payment_items` | `id`, `payment_id`, `fee_id`, `amount_poisha` |
| `receipts` | `id`, `receipt_no`, `payment_id`, `student_id`, `amount_poisha`, `issued_at` |
| `notices` | `id`, `title`, `body`, `category`, `eyebrow`, `greeting`, `signature`, `audience`, `audiences`, `status`, `published_on`, `author_id` |
| `notice_attachments` | `id`, `notice_id`, `name`, `format`, `size`, `url` |
| `gallery_albums` | `id`, `title`, `slug`, `category`, `visibility`, `description`, `cover_url`, `photo_count`, `published_on` |
| `gallery_photos` | `id`, `album_id`, `url`, `caption`, `name`, `size`, `width`, `height`, `status`, `uploaded_by_id`, `reviewed_by_id`, `reviewed_at` |
| `routines` | `id`, `class_id`, `section_id`, `effective_from`, `published` |
| `routine_periods` | `id`, `routine_id`, `day`, `period`, `subject_id`, `teacher_id`, `start_time`, `end_time`, `room` |
| `calendar_events` | `id`, `title`, `date`, `end_date`, `type`, `audience`, `description` |
| `audit_log` | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at` |
| `navigation_items` | `id`, `label`, `href`, `parent_id`, `position`, `visible` |
| `portal_nav_items` | `id`, `role`, `label`, `href`, `icon`, `position`, `parent_id` |
| `admission_steps` | `id`, `title`, `description`, `position` |
| `quick_links` | `id`, `label`, `href`, `icon`, `position` |
| `school_stats` | `id`, `label`, `value`, `position` |
| `about_content` | `id`, `key`, `value` |

Money is stored as an integer number of poisha (1 taka = 100 poisha), so no
amount ever goes through a float.

---

## 2. The state that lives only in memory

Every entry below is a change the user makes that survives a toast but not a
reload. Each one needs an endpoint.

### 2.1 Attendance save — `src/components/teacher/teacher-attendance.tsx`

The teacher marks present / absent / late for a class, section and date. The
marks live in `marks` state, and `save()` only sets the timestamp and raises a
toast. The sheet is re-read from `teacherAttendanceSheets` when the class,
section or date changes, so an unsaved sheet is lost on navigation.

| Need | Endpoint |
| --- | --- |
| Read a sheet | `GET /api/attendance?class_id=class-9&section=A&date=2026-11-04` |
| Save the marks | `PUT /api/attendance` with the class, section, date and the `{ student_id: status }` map |
| Who marked it | `marked_by` on the attendance row, from the session |

### 2.2 Result publish — `src/components/teacher/teacher-results.tsx`

The teacher types the marks of a subject, saves a draft and publishes the
sheet. `marks`, `status` and `savedAt` are page state, and the published sheet
is not visible to the students afterwards.

| Need | Endpoint |
| --- | --- |
| Read the sheet | `GET /api/result_sheets?exam_id=…&class_id=…&section=…&subject=…` |
| Save the draft | `PUT /api/result_sheets/:id` with the marks |
| Publish the sheet | `POST /api/result_sheets/:id/publish` |

### 2.3 Fee payment — `src/data/student.ts` and `src/components/student/student-payment-method.tsx`

The payment method page records the payment into the module-level
`paymentStore` in `src/data/student.ts`. The fees table and the receipt read
that store, so the three fee pages agree with each other — but the payment is
gone when the tab is closed.

Only the last four digits of a card are kept: `recordPayment()` receives
`cardLast4` and never the full number. The endpoint must not accept the full
number either.

| Need | Endpoint |
| --- | --- |
| List the fees of the student | `GET /api/students/me/fees` |
| Pay | `POST /api/payments` with the fee ids, the method, the transaction id and (for a card) `card_last4` only |
| The receipt | `GET /api/receipts/:id` |
| The fee status after the payment | `GET /api/students/me/fees` again, or a `fees` refetch after the payment resolves |

### 2.4 Gallery approval — `src/components/admin/admin-gallery.tsx` and `src/components/teacher/teacher-gallery.tsx`

The teacher stages the picked files as `Awaiting admin approval` in page
state. The admin approval queue reads its own mock list, so a staged photo
never reaches the queue. Approving or rejecting a photo changes the
`reviews` state of the admin page only.

| Need | Endpoint |
| --- | --- |
| Stage an upload | `POST /api/gallery_photos` with the album id and the file |
| Read the approval queue | `GET /api/gallery_photos?status=awaiting_approval` |
| Approve or reject | `PATCH /api/gallery_photos/:id` with the status |
| Rename an album | `PATCH /api/gallery_albums/:id` |

### 2.5 User create and deactivate — `src/components/admin/admin-users.tsx`

`createUser()` prepends the new account to the `accounts` state and
`toggleStatus()` flips `status` between `Active` and `Inactive`. Both raise a
toast and both are lost on reload.

| Need | Endpoint |
| --- | --- |
| List the users | `GET /api/users` |
| Create a user | `POST /api/users` with the name, role, class or department, email and the temporary password |
| Activate or deactivate | `PATCH /api/users/:id` with the status |
| Reset the password | `POST /api/users/:id/reset-password` |
| Import from CSV | `POST /api/users/import` with the file |

### 2.6 The other in-memory edits

These are the same kind of change: they work, they raise a toast, and they do
not survive a reload.

| Where | What it changes | Endpoint |
| --- | --- | --- |
| `src/components/admin/admin-notices.tsx` | Publishes a notice, and publishes an existing draft | `POST /api/notices`, `PATCH /api/notices/:id` |
| `src/components/admin/admin-fees.tsx` | Saves the fee structure of a band, and marks a payment as paid | `PATCH /api/fee_structure/:id`, `PATCH /api/payments/:id` |
| `src/components/admin/admin-routine.tsx` | Saves and publishes the routine of a class | `PUT /api/routines`, `POST /api/routines/:id/publish` |
| `src/components/admin/admin-calendar.tsx` | Adds a calendar event | `POST /api/calendar_events` |
| `src/components/admin/admin-classes.tsx` | Adds a class, and assigns a subject to a class | `POST /api/classes`, `POST /api/class_subjects` |
| `src/components/admin/admin-audit-log.tsx` | Read-only; the search, the filter and the page are view state only | `GET /api/audit_log` |

---

## 3. The order the work can land in

1. **Read only.** `users`, `classes`, `students`, `teachers`, `notices`,
   `gallery_albums`, `gallery_photos`, `routines`, `calendar_events`,
   `exam_results`, `attendance`, `fees`, `payments`, `audit_log`. Every page
   replaces its mock import with a fetch and nothing else changes.
2. **Writes.** The in-memory edits above, one table at a time. The fee payment
   is the one to do first, because the receipt and the fees table have to agree
   across two pages.
3. **Uploads.** The gallery needs a file endpoint, so it comes after the
   gallery tables exist.
4. **Authentication.** The `users` table needs a password column and a session
   before the login page can stop being a UI. The role on the user row decides
   which portal the shell shows.
