-- The billing slot of a fee line.
--
-- Every line of a fee structure belongs to a slot, e.g. "2026-11:tuition".
-- The unique key on the student, the fee structure and the slot is what
-- makes issuing the same slot twice change nothing instead of creating a
-- second line.
ALTER TABLE "fees" ADD COLUMN     "period" TEXT;

-- The rows that are already there are given the slot of their own label, so
-- the key can be built without two lines landing on the same slot.
UPDATE "fees"
SET "period" = concat(
  to_char("due_date", 'YYYY-MM'),
  ':',
  CASE
    WHEN lower("label") LIKE '%tuition%' THEN 'tuition'
    WHEN lower("label") LIKE '%admission%' THEN 'admission'
    WHEN lower("label") LIKE '%activit%' THEN 'activities'
    ELSE regexp_replace(lower("label"), '[^a-z0-9]+', '-', 'g')
  END
);

-- Every line carries a slot from now on.
ALTER TABLE "fees" ALTER COLUMN "period" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "fees_student_id_fee_structure_id_period_key" ON "fees"("student_id", "fee_structure_id", "period");

-- CreateTable
CREATE TABLE "receipt_counters" (
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL,

    CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("year")
);
