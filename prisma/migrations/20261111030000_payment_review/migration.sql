-- The review of a payment that waits for verification.
--
-- A student submits a payment and it lands in `PENDING`. The admin either
-- approves it — the receipt is written and the fees are marked as paid — or
-- rejects it with a reason. These three columns hold that decision.
ALTER TABLE "payments" ADD COLUMN     "reviewed_by_id" TEXT;
ALTER TABLE "payments" ADD COLUMN     "reviewed_at" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN     "review_note" TEXT;

-- CreateIndex
CREATE INDEX "payments_reviewed_by_id_idx" ON "payments"("reviewed_by_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
