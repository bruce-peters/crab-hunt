alter table events
  add column if not exists answered_player_ids uuid[] not null default '{}';

-- Allow authenticated users to update answered_player_ids (appending their own id)
-- The existing "events: update" policy already covers this.
