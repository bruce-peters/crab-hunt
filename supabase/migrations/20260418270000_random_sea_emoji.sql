-- Pool of crustacean / sea creature emojis
create or replace function random_sea_emoji()
returns text
language sql
as $$
  select (array[
    '🦀', '🦞', '🦐', '🦑', '🐙', '🦈', '🐡', '🐠', '🐟', '🐬',
    '🐳', '🐋', '🦭', '🐊', '🦦', '🪸', '🐚', '🦪', '🫧', '🌊'
  ])[floor(random() * 20 + 1)::int];
$$;

-- Replace the trigger function to use a random sea emoji instead of always 🦀
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
    random_sea_emoji()
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
