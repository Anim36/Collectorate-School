-- CreateEnum
CREATE TYPE "GradingMode" AS ENUM ('GPA', 'GRADE_ONLY');

-- DropForeignKey
ALTER TABLE "fees" DROP CONSTRAINT "fees_band_id_fkey";

-- DropIndex
DROP INDEX "fee_structure_band_academic_year_id_key";

-- DropIndex
DROP INDEX "fees_band_id_idx";

-- DropIndex
DROP INDEX "students_section_id_roll_academic_year_id_key";

-- AlterTable
ALTER TABLE "classes" DROP COLUMN "level",
DROP COLUMN "shift",
ADD COLUMN     "grading_mode" "GradingMode" NOT NULL DEFAULT 'GPA',
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "fee_structure" DROP COLUMN "band",
ADD COLUMN     "class_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "fees" DROP COLUMN "band_id",
ADD COLUMN     "fee_structure_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sections" DROP COLUMN "shift",
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "attendance_marked_by_id_idx" ON "attendance"("marked_by_id");

-- CreateIndex
CREATE INDEX "attendance_sheets_marked_by_id_idx" ON "attendance_sheets"("marked_by_id");

-- CreateIndex
CREATE INDEX "classes_sort_order_idx" ON "classes"("sort_order");

-- CreateIndex
CREATE INDEX "exam_results_entered_by_id_idx" ON "exam_results"("entered_by_id");

-- CreateIndex
CREATE INDEX "fee_structure_class_id_idx" ON "fee_structure"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structure_class_id_academic_year_id_key" ON "fee_structure"("class_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "fees_fee_structure_id_idx" ON "fees"("fee_structure_id");

-- CreateIndex
CREATE INDEX "gallery_photos_uploaded_by_id_idx" ON "gallery_photos"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "gallery_photos_reviewed_by_id_idx" ON "gallery_photos"("reviewed_by_id");

-- CreateIndex
CREATE INDEX "notices_author_id_idx" ON "notices"("author_id");

-- CreateIndex
CREATE INDEX "payments_recorded_by_id_idx" ON "payments"("recorded_by_id");

-- CreateIndex
CREATE INDEX "result_sheets_section_id_idx" ON "result_sheets"("section_id");

-- CreateIndex
CREATE INDEX "result_sheets_entered_by_id_idx" ON "result_sheets"("entered_by_id");

-- CreateIndex
CREATE INDEX "routine_periods_routine_id_idx" ON "routine_periods"("routine_id");

-- CreateIndex
CREATE INDEX "sections_class_id_idx" ON "sections"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_class_id_roll_academic_year_id_key" ON "students"("class_id", "roll", "academic_year_id");

-- AddForeignKey
ALTER TABLE "fee_structure" ADD CONSTRAINT "fee_structure_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fees" ADD CONSTRAINT "fees_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
