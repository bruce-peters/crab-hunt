-- Add is_admin flag to players so designated admins can manage events
alter table players
  add column if not exists is_admin boolean not null default false;

-- Admins can read/update any event (needed for dashboard actions)
drop policy if exists "events: admin full access" on events;
create policy "events: admin full access" on events
  for all
  using (
    exists (
      select 1 from players
      where user_id = auth.uid()
        and is_admin = true
    )
  )
  with check (
    exists (
      select 1 from players
      where user_id = auth.uid()
        and is_admin = true
    )
  );
