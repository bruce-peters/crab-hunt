ALTER TABLE events DROP COLUMN IF EXISTS number_based_question_answer;
ALTER TABLE events ALTER COLUMN number_based_question TYPE jsonb USING NULL;
