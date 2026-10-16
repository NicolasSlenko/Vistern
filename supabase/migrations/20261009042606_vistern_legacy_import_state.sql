-- Record completed per-user imports so an empty destination does not cause
-- removed legacy S3 records to be imported again on a later request.
create table public.legacy_import_state (
  clerk_user_id text not null,
  dataset text not null check (dataset in (
    'preferences', 'settings', 'saved_jobs', 'profile', 'course_progress', 'usage'
  )),
  rows_imported integer not null default 0 check (rows_imported >= 0),
  completed_at timestamptz not null default now(),
  primary key (clerk_user_id, dataset)
);

grant select, insert, update, delete on table public.legacy_import_state to authenticated;
revoke all on table public.legacy_import_state from anon;
alter table public.legacy_import_state enable row level security;
create policy legacy_import_state_clerk_user_policy
  on public.legacy_import_state
  for all to authenticated
  using (clerk_user_id = ((select auth.jwt()) ->> 'sub'))
  with check (clerk_user_id = ((select auth.jwt()) ->> 'sub'));
