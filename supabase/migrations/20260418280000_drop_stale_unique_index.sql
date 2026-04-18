-- The stale (player_id, question) unique index was left over from an earlier
-- schema iteration. It blocks upserts that correctly scope answers per-event
-- using the (player_id, event_id, question) unique constraint.
alter table public.self_answers
  drop constraint if exists self_answers_player_question_unique;
