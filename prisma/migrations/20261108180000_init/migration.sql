-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('TEACHER', 'OFFICER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('DUE', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BKASH', 'NAGAD', 'CARD', 'CASH', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NoticeAudience" AS ENUM ('PUBLIC', 'STUDENTS', 'TEACHERS');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "GalleryVisibility" AS ENUM ('PUBLIC', 'TEACHERS');

-- CreateEnum
CREATE TYPE "GalleryPhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('EXAM', 'HOLIDAY', 'EVENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "login_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "class_or_department" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER,
    "shift" TEXT,
    "academic_year_id" TEXT,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shift" TEXT,
    "class_teacher_id" TEXT,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_subjects" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "teacher_id" TEXT,

    CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "roll" INTEGER NOT NULL,
    "guardian_name" TEXT,
    "guardian_phone" TEXT,
    "phone" TEXT,
    "emergency_contact" TEXT,
    "email" TEXT,
    "address" TEXT,
    "photo_url" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "designation" TEXT,
    "department" TEXT,
    "subject" TEXT,
    "phone" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "subject" TEXT,
    "department" TEXT,
    "staff_type" "StaffType" NOT NULL DEFAULT 'TEACHER',
    "email" TEXT,
    "photo_url" TEXT,
    "photo_width" INTEGER,
    "photo_height" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "marked_by_id" TEXT,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sheets" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "marked_by_id" TEXT,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "term" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "academic_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_sheets" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "entered_by_id" TEXT,

    CONSTRAINT "result_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "result_sheet_id" TEXT,
    "marks" INTEGER,
    "grade" TEXT,
    "gpa" DECIMAL(3,2),
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "entered_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structure" (
    "id" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "academic_year_id" TEXT,
    "monthly_tuition_poisha" INTEGER NOT NULL,
    "admission_fee_poisha" INTEGER NOT NULL,
    "activities_poisha" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fees" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "band_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount_poisha" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "FeeStatus" NOT NULL DEFAULT 'DUE',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "amount_poisha" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "transaction_id" TEXT,
    "card_last4" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "invoice_no" TEXT,
    "paid_at" TIMESTAMP(3),
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_items" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "fee_id" TEXT NOT NULL,
    "amount_poisha" INTEGER NOT NULL,

    CONSTRAINT "payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "receipt_no" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "amount_poisha" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "eyebrow" TEXT,
    "greeting" TEXT,
    "signature" TEXT,
    "audience" "NoticeAudience" NOT NULL DEFAULT 'PUBLIC',
    "audiences" "NoticeAudience"[] DEFAULT ARRAY[]::"NoticeAudience"[],
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "published_on" DATE,
    "author_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_attachments" (
    "id" TEXT NOT NULL,
    "notice_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT,
    "size" TEXT,
    "url" TEXT,

    CONSTRAINT "notice_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_albums" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "visibility" "GalleryVisibility" NOT NULL DEFAULT 'PUBLIC',
    "description" TEXT,
    "cover_url" TEXT,
    "photo_count" INTEGER NOT NULL DEFAULT 0,
    "published_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_photos" (
    "id" TEXT NOT NULL,
    "album_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "name" TEXT,
    "size" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "status" "GalleryPhotoStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_by_id" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_periods" (
    "id" TEXT NOT NULL,
    "routine_id" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "subject_id" TEXT,
    "teacher_id" TEXT,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room" TEXT,

    CONSTRAINT "routine_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "end_date" DATE,
    "type" "CalendarEventType" NOT NULL,
    "audience" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_steps" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "admission_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_links" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quick_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_stats" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "school_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "about_content" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "about_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT,
    "parent_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_nav_items" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "parent_id" TEXT,

    CONSTRAINT "portal_nav_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_id_key" ON "users"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_name_key" ON "academic_years"("name");

-- CreateIndex
CREATE UNIQUE INDEX "classes_name_key" ON "classes"("name");

-- CreateIndex
CREATE INDEX "classes_academic_year_id_idx" ON "classes"("academic_year_id");

-- CreateIndex
CREATE INDEX "sections_class_teacher_id_idx" ON "sections"("class_teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_class_id_name_key" ON "sections"("class_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateIndex
CREATE INDEX "class_subjects_subject_id_idx" ON "class_subjects"("subject_id");

-- CreateIndex
CREATE INDEX "class_subjects_teacher_id_idx" ON "class_subjects"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_subjects_class_id_subject_id_key" ON "class_subjects"("class_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_id_key" ON "students"("student_id");

-- CreateIndex
CREATE INDEX "students_class_id_idx" ON "students"("class_id");

-- CreateIndex
CREATE INDEX "students_section_id_idx" ON "students"("section_id");

-- CreateIndex
CREATE INDEX "students_academic_year_id_idx" ON "students"("academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_section_id_roll_academic_year_id_key" ON "students"("section_id", "roll", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_user_id_key" ON "teachers"("user_id");

-- CreateIndex
CREATE INDEX "staff_staff_type_idx" ON "staff"("staff_type");

-- CreateIndex
CREATE INDEX "staff_subject_idx" ON "staff"("subject");

-- CreateIndex
CREATE INDEX "attendance_section_id_date_idx" ON "attendance"("section_id", "date");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_student_id_date_key" ON "attendance"("student_id", "date");

-- CreateIndex
CREATE INDEX "attendance_sheets_date_idx" ON "attendance_sheets"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sheets_section_id_date_key" ON "attendance_sheets"("section_id", "date");

-- CreateIndex
CREATE INDEX "exams_published_idx" ON "exams"("published");

-- CreateIndex
CREATE INDEX "exams_academic_year_id_idx" ON "exams"("academic_year_id");

-- CreateIndex
CREATE INDEX "result_sheets_class_id_idx" ON "result_sheets"("class_id");

-- CreateIndex
CREATE INDEX "result_sheets_subject_id_idx" ON "result_sheets"("subject_id");

-- CreateIndex
CREATE INDEX "result_sheets_status_idx" ON "result_sheets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "result_sheets_exam_id_section_id_subject_id_key" ON "result_sheets"("exam_id", "section_id", "subject_id");

-- CreateIndex
CREATE INDEX "exam_results_student_id_idx" ON "exam_results"("student_id");

-- CreateIndex
CREATE INDEX "exam_results_subject_id_idx" ON "exam_results"("subject_id");

-- CreateIndex
CREATE INDEX "exam_results_status_idx" ON "exam_results"("status");

-- CreateIndex
CREATE INDEX "exam_results_result_sheet_id_idx" ON "exam_results"("result_sheet_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_results_exam_id_student_id_subject_id_key" ON "exam_results"("exam_id", "student_id", "subject_id");

-- CreateIndex
CREATE INDEX "fee_structure_academic_year_id_idx" ON "fee_structure"("academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structure_band_academic_year_id_key" ON "fee_structure"("band", "academic_year_id");

-- CreateIndex
CREATE INDEX "fees_student_id_status_idx" ON "fees"("student_id", "status");

-- CreateIndex
CREATE INDEX "fees_band_id_idx" ON "fees"("band_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoice_no_key" ON "payments"("invoice_no");

-- CreateIndex
CREATE INDEX "payments_student_id_paid_at_idx" ON "payments"("student_id", "paid_at");

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payment_items_fee_id_idx" ON "payment_items"("fee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_items_payment_id_fee_id_key" ON "payment_items"("payment_id", "fee_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receipt_no_key" ON "receipts"("receipt_no");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");

-- CreateIndex
CREATE INDEX "receipts_student_id_issued_at_idx" ON "receipts"("student_id", "issued_at");

-- CreateIndex
CREATE INDEX "notices_status_published_on_idx" ON "notices"("status", "published_on");

-- CreateIndex
CREATE INDEX "notices_category_idx" ON "notices"("category");

-- CreateIndex
CREATE INDEX "notices_audience_idx" ON "notices"("audience");

-- CreateIndex
CREATE INDEX "notice_attachments_notice_id_idx" ON "notice_attachments"("notice_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_albums_slug_key" ON "gallery_albums"("slug");

-- CreateIndex
CREATE INDEX "gallery_albums_category_idx" ON "gallery_albums"("category");

-- CreateIndex
CREATE INDEX "gallery_albums_visibility_idx" ON "gallery_albums"("visibility");

-- CreateIndex
CREATE INDEX "gallery_photos_album_id_status_idx" ON "gallery_photos"("album_id", "status");

-- CreateIndex
CREATE INDEX "gallery_photos_status_idx" ON "gallery_photos"("status");

-- CreateIndex
CREATE INDEX "routines_section_id_idx" ON "routines"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "routines_class_id_section_id_effective_from_key" ON "routines"("class_id", "section_id", "effective_from");

-- CreateIndex
CREATE INDEX "routine_periods_subject_id_idx" ON "routine_periods"("subject_id");

-- CreateIndex
CREATE INDEX "routine_periods_teacher_id_idx" ON "routine_periods"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "routine_periods_routine_id_day_period_key" ON "routine_periods"("routine_id", "day", "period");

-- CreateIndex
CREATE INDEX "calendar_events_date_idx" ON "calendar_events"("date");

-- CreateIndex
CREATE INDEX "calendar_events_type_idx" ON "calendar_events"("type");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "about_content_key_key" ON "about_content"("key");

-- CreateIndex
CREATE INDEX "navigation_items_parent_id_idx" ON "navigation_items"("parent_id");

-- CreateIndex
CREATE INDEX "navigation_items_position_idx" ON "navigation_items"("position");

-- CreateIndex
CREATE INDEX "portal_nav_items_role_position_idx" ON "portal_nav_items"("role", "position");

-- CreateIndex
CREATE INDEX "portal_nav_items_parent_id_idx" ON "portal_nav_items"("parent_id");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_teacher_id_fkey" FOREIGN KEY ("class_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sheets" ADD CONSTRAINT "attendance_sheets_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sheets" ADD CONSTRAINT "attendance_sheets_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_sheets" ADD CONSTRAINT "result_sheets_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_sheets" ADD CONSTRAINT "result_sheets_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_sheets" ADD CONSTRAINT "result_sheets_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_sheets" ADD CONSTRAINT "result_sheets_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_sheets" ADD CONSTRAINT "result_sheets_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_result_sheet_id_fkey" FOREIGN KEY ("result_sheet_id") REFERENCES "result_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structure" ADD CONSTRAINT "fee_structure_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fees" ADD CONSTRAINT "fees_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fees" ADD CONSTRAINT "fees_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "fee_structure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_fee_id_fkey" FOREIGN KEY ("fee_id") REFERENCES "fees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_attachments" ADD CONSTRAINT "notice_attachments_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "gallery_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_periods" ADD CONSTRAINT "routine_periods_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_periods" ADD CONSTRAINT "routine_periods_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_periods" ADD CONSTRAINT "routine_periods_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "navigation_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_nav_items" ADD CONSTRAINT "portal_nav_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "portal_nav_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
