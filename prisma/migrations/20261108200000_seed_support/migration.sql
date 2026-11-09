-- AlterEnum
ALTER TYPE "NoticeAudience" ADD VALUE 'GUARDIANS';

-- DropIndex
DROP INDEX "payments_invoice_no_key";

-- AlterTable
ALTER TABLE "fees" ADD COLUMN     "invoice_no" TEXT;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "invoice_no";

-- AlterTable
ALTER TABLE "portal_nav_items" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'link';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "fees_invoice_no_key" ON "fees"("invoice_no");

-- CreateIndex
CREATE UNIQUE INDEX "fees_student_id_label_due_date_key" ON "fees"("student_id", "label", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");
