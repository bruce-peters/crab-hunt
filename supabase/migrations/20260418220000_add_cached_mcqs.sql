-- Cache GPT-generated MCQ questions per event to avoid redundant API calls
alter table events add column if not exists cached_mcqs jsonb;
