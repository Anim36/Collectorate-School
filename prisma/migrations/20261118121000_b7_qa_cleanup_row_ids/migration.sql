-- B7: let the QA cleanup function take row ids.
--
-- The first version of `qa_delete_audit_rows` filtered on the actor, the
-- entity id and an entity-id prefix. Two checks also find rows by a value
-- inside the metadata (`metadata.name` and `metadata.names[0]`), which Prisma
-- can select but SQL would have to reshape. The function takes the row ids
-- those checks found instead.
--
-- The old four-argument function is dropped, so there is exactly one cleanup
-- entry point.

DROP FUNCTION IF EXISTS qa_delete_audit_rows(text[], text[], text, boolean);

CREATE OR REPLACE FUNCTION qa_delete_audit_rows(
  p_row_ids text[] DEFAULT NULL,
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
  IF p_row_ids IS NULL
     AND p_actor_ids IS NULL
     AND p_entity_ids IS NULL
     AND p_entity_prefix IS NULL
     AND p_keep_seeded = false THEN
    RAISE EXCEPTION
      'qa_delete_audit_rows needs at least one filter; use p_keep_seeded to keep the seed rows';
  END IF;

  PERFORM set_config('app.qa_audit_cleanup', 'on', true);

  DELETE FROM "audit_log"
  WHERE (p_row_ids IS NULL OR "id" = ANY (p_row_ids))
    AND (p_actor_ids IS NULL OR "actor_id" = ANY (p_actor_ids))
    AND (p_entity_ids IS NULL OR "entity_id" = ANY (p_entity_ids))
    AND (p_entity_prefix IS NULL OR "entity_id" LIKE p_entity_prefix || '%')
    AND (p_keep_seeded = false OR "id" NOT LIKE 'audit-%');

  GET DIAGNOSTICS deleted = ROW_COUNT;

  PERFORM set_config('app.qa_audit_cleanup', 'off', true);

  RETURN deleted;
END;
$$;
