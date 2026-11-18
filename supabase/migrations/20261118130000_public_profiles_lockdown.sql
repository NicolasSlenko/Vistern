-- Lock down the People directory (public_profiles, from 20261118120000).
--
-- The first version let a student write their own row and let any signed-in
-- student select every listed row, Clerk user id included. Now:
-- - Only the server writes rows, with the secret key (service_role), so a
--   card's name, verified-school badge and links can't be forged by
--   skipping the API.
-- - A student can read and delete their own row (deleting is unlisting, and
--   account deletion needs it).
-- - Other students call list_people(), which returns the card and an opaque
--   id for listed rows only: no Clerk user id, no sharing choices.
--
-- Safe to run more than once.

drop policy if exists public_profiles_owner_policy on public.public_profiles;
drop policy if exists public_profiles_listed_read_policy on public.public_profiles;
drop policy if exists public_profiles_owner_read_policy on public.public_profiles;
drop policy if exists public_profiles_owner_delete_policy on public.public_profiles;

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

-- Cards written while students could write them can't be trusted: hide them
-- until their owner saves again, which rebuilds the card on the server.
update public.public_profiles set listed = false where listed;

-- The directory. Security definer so it can read listed rows past the
-- owner-only policy; it returns only the three public columns. Signed-in
-- students only: a call without a token has no `sub` and gets nothing.
create or replace function public.list_people(p_limit integer default 300)
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
