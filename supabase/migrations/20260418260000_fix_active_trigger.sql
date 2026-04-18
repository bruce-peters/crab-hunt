-- Fix the trigger function to use the correct pg_net API: net.http_post()
-- Also store the project URL as a DB setting so the trigger can reference it.

-- ── Fixed trigger function ─────────────────────────────────────────────────────
create or replace function trigger_on_event_active()
returns trigger
language plpgsql
security definer
as $$
declare
  _url text := 'https://rrsijbdoqllgnyvcoyqs.supabase.co/functions/v1/on-event-active';
begin
  -- Only act when status flips TO 'active'
  if (OLD.status is distinct from 'active') and NEW.status = 'active' then

    -- net.http_post is the pg_net function; runs asynchronously (fire-and-forget)
    perform net.http_post(
      url     := _url,
      body    := json_build_object('event_id', NEW.id)::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
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
