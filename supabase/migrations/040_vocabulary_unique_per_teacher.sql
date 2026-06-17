-- Fix vocabulary uniqueness: words are unique per teacher, not globally
ALTER TABLE vocabulary_items DROP CONSTRAINT IF EXISTS vocabulary_items_letter_word_key;
ALTER TABLE vocabulary_items ADD CONSTRAINT vocabulary_items_letter_word_teacher_key UNIQUE (letter, word, teacher_id);
