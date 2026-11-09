-- The normalised login id, added in two steps so the existing rows can be
-- backfilled before the column is made unique.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "login_id_normalized" TEXT;

-- Backfill: the normalised copy of the login id.
UPDATE "users" SET "login_id_normalized" = LOWER(TRIM("login_id"));

-- The backfill must not have produced two accounts with the same handle.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "users"
        GROUP BY "login_id_normalized"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'two accounts share a login id once it is lower cased; rename one of them before running this migration';
    END IF;
END $$;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "login_id_normalized" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_login_id_normalized_key" ON "users"("login_id_normalized");
