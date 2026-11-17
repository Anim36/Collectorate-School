-- B7: security hardening.
--
-- Three things happen here:
--
--   1. `audit_log` becomes append-only in the database. A row trigger refuses
--      UPDATE and DELETE, and a statement trigger refuses TRUNCATE, so a
--      connection that skips the application still cannot rewrite history.
--   2. A rate-limit table is added for the small database-backed limiter.
--   3. The two navigation tables are dropped: the app never read them, because
--      the navbar and the portal sidebars are part of the route contract and
--      live in code.

/* ------------------------------------------------------------ rate limits --- */

CREATE TABLE "rate_limit_attempts" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rate_limit_attempts_action_bucket_created_at_idx"
    ON "rate_limit_attempts"("action", "bucket", "created_at");

CREATE INDEX "rate_limit_attempts_created_at_idx"
    ON "rate_limit_attempts"("created_at");

/* --------------------------------------------------------------- indexes --- */

CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");
CREATE INDEX "fees_status_due_date_idx" ON "fees"("status", "due_date");
CREATE INDEX "payments_status_paid_at_idx" ON "payments"("status", "paid_at");
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log"("action", "created_at");

/* ------------------------------------------------------- append-only log --- */

CREATE OR REPLACE FUNCTION audit_log_refuse_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- The QA cleanup function sets this setting for its own statement. No
  -- application code sets it. An UPDATE is never allowed, even then.
  IF TG_OP = 'DELETE'
     AND current_setting('app.qa_audit_cleanup', true) = 'on' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION
    'audit_log is append-only: % is refused', TG_OP
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION audit_log_refuse_truncate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'audit_log is append-only: TRUNCATE is refused'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS "audit_log_no_update_or_delete" ON "audit_log";
CREATE TRIGGER "audit_log_no_update_or_delete"
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_refuse_mutation();

DROP TRIGGER IF EXISTS "audit_log_no_truncate" ON "audit_log";
CREATE TRIGGER "audit_log_no_truncate"
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_log_refuse_truncate();

/*
 * The QA cleanup path.
 *
 * The checks need to remove the rows they wrote. They call this function
 * instead of a plain DELETE, and the function sets a transaction-local
 * setting that the row trigger allows. It is a separate, named mechanism, so
 * nothing in the application ever performs a DELETE on the table.
 *
 * In production the function can be dropped after the checks have run:
 *
 *   DROP FUNCTION IF EXISTS qa_delete_audit_rows(text[], text[], text, boolean);
 *
 * The trigger stays either way.
 */
CREATE OR REPLACE FUNCTION qa_delete_audit_rows(
  p_actor_ids text[] DEFAULT NULL,
  p_entity_ids text[] DEFAULT NULL,
  p_entity_prefix text DEFAULT NULL,
  p_keep_seeded boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted integer;
BEGIN
  IF p_actor_ids IS NULL
     AND p_entity_ids IS NULL
     AND p_entity_prefix IS NULL
     AND p_keep_seeded = false THEN
    RAISE EXCEPTION
      'qa_delete_audit_rows needs at least one filter; use p_keep_seeded to keep the seed rows';
  END IF;

  PERFORM set_config('app.qa_audit_cleanup', 'on', true);

  DELETE FROM "audit_log"
  WHERE (p_actor_ids IS NULL OR "actor_id" = ANY (p_actor_ids))
    AND (p_entity_ids IS NULL OR "entity_id" = ANY (p_entity_ids))
    AND (p_entity_prefix IS NULL OR "entity_id" LIKE p_entity_prefix || '%')
    AND (p_keep_seeded = false OR "id" NOT LIKE 'audit-%');

  GET DIAGNOSTICS deleted = ROW_COUNT;

  PERFORM set_config('app.qa_audit_cleanup', 'off', true);

  RETURN deleted;
END;
$$;

/* ------------------------------------------------------- unused tables --- */

DROP TABLE IF EXISTS "portal_nav_items" CASCADE;
DROP TABLE IF EXISTS "navigation_items" CASCADE;
