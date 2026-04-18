-- Add a proper status column to events (replaces the boolean is_started)
alter table events
  add column if not exists status text not null default 'waiting'
  check (status in ('waiting', 'active', 'finished'));

-- Migrate existing data: rows where is_started = true become 'active'
update events set status = 'active' where is_started = true;

-- Enable pg_net so triggers can make outbound HTTP calls
create extension if not exists pg_net with schema extensions;

-- ── Trigger function ───────────────────────────────────────────────────────────
-- Fires when an event's status transitions to 'active'.
-- Makes a fire-and-forget HTTP POST to the on-event-active edge function.
create or replace function trigger_on_event_active()
returns trigger
language plpgsql
security definer
as $$
declare
  _url    text;
  _key    text;
  _body   text;
begin
  -- Only act when status flips TO 'active'
  if (OLD.status is distinct from 'active') and NEW.status = 'active' then
    _url  := current_setting('app.supabase_url', true)
             || '/functions/v1/on-event-active';
    _key  := current_setting('app.supabase_service_role_key', true);
    _body := json_build_object('event_id', NEW.id)::text;

    perform extensions.http_post(
      url     := _url,
      body    := _body,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || _key
      )
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_event_becomes_active on events;
create trigger on_event_becomes_active
  after update on events
  for each row
  execute procedure trigger_on_event_active();

-- Store the project URL and service role key as DB settings so the trigger can read them.
-- These are injected automatically by Supabase; set them here as a fallback for local dev.
-- In production, set via: ALTER DATABASE postgres SET app.supabase_url = '...';
-- (Supabase dashboard → Settings → Database → Configuration)
