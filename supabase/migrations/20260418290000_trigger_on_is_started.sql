-- Change the trigger to fire on is_started flipping to TRUE
-- (status column stays — AdminDashboard.tsx reads/writes it)

create or replace function trigger_on_event_active()
returns trigger
language plpgsql
security definer
as $$
declare
  _url text := 'https://rrsijbdoqllgnyvcoyqs.supabase.co/functions/v1/on-event-active';
begin
  -- Only act when is_started flips from false -> true
  if (OLD.is_started = false) and (NEW.is_started = true) then
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
