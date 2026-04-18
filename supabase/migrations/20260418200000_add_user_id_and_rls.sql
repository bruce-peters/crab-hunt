-- Add user_id to players so we can look up the player for a logged-in auth user
alter table players
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists players_user_id_key on players(user_id);

-- Auto-create a player row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.players (user_id, name, emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    '🦀'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table players     enable row level security;
alter table self_answers enable row level security;
alter table events       enable row level security;

-- Players: anyone authenticated can read; each user can only touch their own row
create policy "players: read all"   on players for select using (auth.role() = 'authenticated');
create policy "players: insert own" on players for insert with check (user_id = auth.uid());
create policy "players: update own" on players for update using (user_id = auth.uid());

-- Self-answers: owner can read/write their own answers
create policy "self_answers: read own"   on self_answers for select using (
  player_id = (select id from players where user_id = auth.uid())
);
create policy "self_answers: upsert own" on self_answers for insert with check (
  player_id = (select id from players where user_id = auth.uid())
);
create policy "self_answers: update own" on self_answers for update using (
  player_id = (select id from players where user_id = auth.uid())
);

-- Events: all authenticated users can read; creation allowed for authenticated users
create policy "events: read all"    on events for select using (auth.role() = 'authenticated');
create policy "events: insert"      on events for insert with check (auth.role() = 'authenticated');
create policy "events: update"      on events for update using (auth.role() = 'authenticated');
