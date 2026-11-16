-- The one unsettled payment item per fee line, held by the database.
--
-- The rule the application also keeps: a fee line can sit in one unsettled
-- payment only. A second unsettled item for the same fee cannot exist.
--
-- PostgreSQL will not accept a subquery in the predicate of an index, so the
-- rule is kept in a trigger instead of in a partial unique index. The trigger
-- is the second wall behind the lock the application takes
-- (`submitStudentPayment` in `src/server/services/student-fees.ts`): it holds
-- even if the lock is ever left out, and even for a write that skips the
-- application altogether.
--
-- The check below is a check-then-act, so on its own it is not enough: two
-- transactions that write one item each for the same fee at the same moment
-- would both read "no unsettled item" and both would write one. The fee row is
-- therefore locked for the length of the transaction before the check is made.
-- The second writer waits for the first one to finish and then reads the item
-- the first one wrote, so it is refused.
--
-- The lock is taken on the fee row and the check is made on the items of that
-- fee, so two writers of different fees never wait for each other.
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

    -- The fee row is locked before the check is made, so two writes for the
    -- same fee cannot both read "no unsettled item" and both write one.
    PERFORM 1
    FROM "fees"
    WHERE "id" = NEW."fee_id"
    FOR UPDATE;

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
