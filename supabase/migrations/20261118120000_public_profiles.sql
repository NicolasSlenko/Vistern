-- The People directory. One row per student who has set up a card.
--
-- `card` is a copy of only what the student chose to share, built on the
-- server from their profile (src/lib/community/public-card.ts). Other students
-- read this table and nothing else, so a private table never needs to be
-- opened to anyone but its owner. `sharing` is the owner's choices, kept so
-- the card can be rebuilt when the profile changes.
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

grant select, insert, update, delete on table public.public_profiles to authenticated;
revoke all on table public.public_profiles from anon;
alter table public.public_profiles enable row level security;

-- The owner can do anything with their own row.
create policy public_profiles_owner_policy
  on public.public_profiles
  for all to authenticated
  using (clerk_user_id = ((select auth.jwt()) ->> 'sub'))
  with check (clerk_user_id = ((select auth.jwt()) ->> 'sub'));

-- Any signed-in student can read a card its owner has listed. Unlisting hides
-- it at once; signed-out visitors see nothing.
create policy public_profiles_listed_read_policy
  on public.public_profiles
  for select to authenticated
  using (listed);
