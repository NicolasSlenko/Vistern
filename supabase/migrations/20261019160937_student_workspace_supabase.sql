-- Persist onboarding and career activity outside S3. Clerk remains the identity provider.
alter table public.student_profiles
  add column onboarding jsonb not null default '{}'::jsonb,
  add constraint student_profiles_onboarding_object
    check (jsonb_typeof(onboarding) = 'object');

create table public.career_workspaces (
  clerk_user_id text primary key,
  revision integer not null default 0 check (revision >= 0),
  data jsonb not null default '{"version":1,"revision":0,"activities":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_workspaces_data_object check (jsonb_typeof(data) = 'object')
);

grant select, insert, update, delete on table public.career_workspaces to authenticated;
revoke all on table public.career_workspaces from anon;
alter table public.career_workspaces enable row level security;
create policy career_workspaces_clerk_user_policy
  on public.career_workspaces
  for all to authenticated
  using (clerk_user_id = ((select auth.jwt()) ->> 'sub'))
  with check (clerk_user_id = ((select auth.jwt()) ->> 'sub'));

-- Track lazy imports from the old S3 JSON records, including empty datasets.
alter table public.legacy_import_state
  drop constraint if exists legacy_import_state_dataset_check;
alter table public.legacy_import_state
  add constraint legacy_import_state_dataset_check check (dataset in (
    'preferences', 'settings', 'saved_jobs', 'profile', 'course_progress', 'usage',
    'student_onboarding', 'career_workspace'
  ));
