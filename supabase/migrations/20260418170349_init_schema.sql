-- Players who participate in events
create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emoji       text not null default '🦀',
  created_at  timestamptz default now()
);

-- Self-question answers submitted by each player before the game
create table if not exists self_answers (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  event_id    uuid not null,
  question    text not null,
  answer      text not null,
  created_at  timestamptz default now(),
  unique (player_id, event_id, question)
);

-- Core event / game session
create table if not exists events (
  id                           uuid primary key default gen_random_uuid(),
  date                         date not null default current_date,
  player_ids                   uuid[] not null default '{}',
  clue_revealed_count          int not null default 0,
  daily_questions              jsonb not null default '[]',
  number_based_question        text,
  number_based_question_answer text,
  is_started                   boolean not null default false,
  created_at                   timestamptz default now()
);

-- FK now that events exists
alter table self_answers
  add constraint self_answers_event_id_fkey
  foreign key (event_id) references events(id) on delete cascade;

-- Enable Realtime for live lobby / game state updates
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table self_answers;
