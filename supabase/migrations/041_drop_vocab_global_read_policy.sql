-- System vocabulary (teacher_id IS NULL) is now a seeding template only.
-- Each teacher owns their own copy. Drop the policy that let everyone read system words.
DROP POLICY IF EXISTS "vocab_global_read" ON vocabulary_items;
