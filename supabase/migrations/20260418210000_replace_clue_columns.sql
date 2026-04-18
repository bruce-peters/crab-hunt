-- Remove old columns
alter table events drop column if exists clue_revealed_count;
alter table events drop column if exists daily_questions;

-- Add new clue columns
alter table events
  add column if not exists daily_clue text,
  add column if not exists displayed_clue text;
