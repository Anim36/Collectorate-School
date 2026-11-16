-- The safety of the student payment.
--
-- Two things are guaranteed here.
--
-- 1. The visit of a student is no longer kept. The dashboard counts the notices
--    that were published in the last seven days, so the count does not depend
--    on a write that a GET page would have to make.
--
-- 2. A fee line can sit in one unsettled payment only. The rule is enforced
--    by the database itself, so a second unsettled item for the same fee
--    cannot exist whatever the application does — not even through a direct
--    connection that skips the server.
--
-- The drop is written with `IF EXISTS` because a migration is not run inside
-- a transaction, so a run that stops half way leaves the statements before
-- it in place. The rule below is written the same way.
ALTER TABLE "students" DROP COLUMN IF EXISTS "last_visited_at";

-- The one unsettled payment item per fee line.
--
-- PostgreSQL will not accept a subquery in the predicate of an index, so the
-- rule is kept in a trigger instead. The trigger refuses the insert of a
-- second item for a line that already sits in a payment that waits for the
-- school.
--
-- The application locks the lines it settles before it reads them
-- (`submitStudentPayment` in `src/server/services/student-fees.ts`), so the
-- second submission of a line waits for the first one to finish and is then
-- refused by the check inside the transaction. The trigger is the second wall
-- behind that one: it holds even if the lock is ever left out.
CREATE OR REPLACE FUNCTION "payment_items_one_pending_per_fee"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    pending_payment "PaymentStatus";
BEGIN
    SELECT "status" INTO pending_payment
    FROM "payments"
    WHERE "id" = NEW."payment_id";

    -- A settled payment settles its lines for good, so the line is free to be
    -- paid again. Only a payment that still waits for the school holds it.
    IF pending_payment IS DISTINCT FROM 'PENDING'::"PaymentStatus" THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "payment_items"
        WHERE "fee_id" = NEW."fee_id"
          AND "payment_id" <> NEW."payment_id"
          AND "payment_id" IN (
              SELECT "id" FROM "payments" WHERE "status" = 'PENDING'::"PaymentStatus"
          )
    ) THEN
        RAISE EXCEPTION
            'the fee % already waits for a payment to be verified', NEW."fee_id"
            USING ERRCODE = 'unique_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "payment_items_one_pending_per_fee" ON "payment_items";

CREATE TRIGGER "payment_items_one_pending_per_fee"
BEFORE INSERT ON "payment_items"
FOR EACH ROW
EXECUTE FUNCTION "payment_items_one_pending_per_fee"();
