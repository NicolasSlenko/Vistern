-- The People directory. One row per student who has set up a card.
--
-- `card` is a copy of only what the student chose to share, built on the
-- server from their profile and their Clerk account (src/lib/community/
-- public-card.ts). `sharing` is their choices, kept so the card can be rebuilt.
--
-- Who can do what:
-- - Only the server writes rows, with the secret key (service_role). A
--   student can't write their own card directly, so nothing on it — the name,
--   the verified-school badge, the links — can be forged by skipping the API.
-- - A student can read and delete their own row (deleting is unlisting, and
--   account deletion needs it).
-- - Other students never touch the table. They call list_people(), which
--   returns the card and an opaque id for listed rows only: no Clerk user id,
--   no sharing choices, nothing for hidden cards.
create table public.public_profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  listed boolean not null default false,
  sharing jsonb not null default '{}'::jsonb,
  card jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_profiles_sharing_object check (jsonb_typeof(sharing) = 'object'),
  constraint public_profiles_card_object check (jsonb_typeof(card) = 'object')
);

create index public_profiles_listed_idx on public.public_profiles (updated_at desc) where listed;

revoke all on table public.public_profiles from public, anon, authenticated;
grant select, delete on table public.public_profiles to authenticated;
grant all on table public.public_profiles to service_role;
alter table public.public_profiles enable row level security;

create policy public_profiles_owner_read_policy
  on public.public_profiles
  for select to authenticated
  using (clerk_user_id = ((select auth.jwt()) ->> 'sub'));

create policy public_profiles_owner_delete_policy
  on public.public_profiles
  for delete to authenticated
  using (clerk_user_id = ((select auth.jwt()) ->> 'sub'));

-- The directory. Security definer so it can read listed rows past the
-- owner-only policy; it returns only the three public columns. Signed-in
-- students only: a call without a token has no `sub` and gets nothing.
create function public.list_people(p_limit integer default 300)
returns table (id uuid, card jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.card, p.updated_at
  from public.public_profiles p
  where p.listed
    and ((select auth.jwt()) ->> 'sub') is not null
  order by p.updated_at desc
  limit least(greatest(coalesce(p_limit, 300), 1), 500)
$$;

revoke all on function public.list_people(integer) from public, anon;
grant execute on function public.list_people(integer) to authenticated;
