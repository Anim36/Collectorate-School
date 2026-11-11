-- The visit of a student.
--
-- The dashboard counts the notices that were published since the student last
-- opened the portal, so the moment of the last visit is kept on the student
-- row.
ALTER TABLE "students" ADD COLUMN     "last_visited_at" TIMESTAMP(3);
