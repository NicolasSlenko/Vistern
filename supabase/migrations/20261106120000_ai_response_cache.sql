-- AI responses keyed by a hash of their input, so asking the same thing twice
-- costs no tokens and no paid request. Per user, under the same Clerk RLS as
-- every other table. Rows are disposable: expired ones are ignored on read and
-- replaced on write.
create table public.ai_cache (
  clerk_user_id text not null,
  cache_key text not null check (char_length(cache_key) = 64),
  feature text not null check (char_length(feature) between 1 and 64),
  result jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (clerk_user_id, cache_key)
);

create index ai_cache_expires_idx on public.ai_cache (expires_at);

grant select, insert, update, delete on table public.ai_cache to authenticated;
revoke all on table public.ai_cache from anon;
alter table public.ai_cache enable row level security;
create policy ai_cache_clerk_user_policy
  on public.ai_cache
  for all to authenticated
  using (clerk_user_id = ((select auth.jwt()) ->> 'sub'))
  with check (clerk_user_id = ((select auth.jwt()) ->> 'sub'));
