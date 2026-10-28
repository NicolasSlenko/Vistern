-- Core Vistern data model.
-- Clerk remains the identity provider; clerk_user_id stores the Clerk JWT `sub`.
-- Resume binaries alone live in S3. Structured resume/profile content lives here.

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  basics jsonb not null default '{}'::jsonb,
  university_id text,
  goals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_profiles_basics_object check (jsonb_typeof(basics) = 'object'),
  constraint student_profiles_goals_array check (jsonb_typeof(goals) = 'array'),
  constraint student_profiles_id_user_unique unique (id, clerk_user_id)
);

create table public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  provider text not null,
  external_id text not null,
  title text not null,
  company text not null,
  location text not null default '',
  apply_url text not null default '',
  match_score smallint not null default 0 check (match_score between 0 and 100),
  contract_type text,
  stage text not null default 'interested'
    check (stage in ('interested', 'applied', 'interviewing', 'offer', 'rejected')),
  job_snapshot jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_jobs_snapshot_object check (jsonb_typeof(job_snapshot) = 'object'),
  constraint saved_jobs_user_provider_external_unique unique (clerk_user_id, provider, external_id),
  constraint saved_jobs_id_user_unique unique (id, clerk_user_id)
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_object check (jsonb_typeof(preferences) = 'object')
);

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  data_sharing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_usage (
  clerk_user_id text not null,
  usage_date date not null,
  feature text not null check (feature in ('analyzeMatch', 'tailorResume')),
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, usage_date, feature)
);

create table public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  clerk_user_id text not null,
  source_type text not null check (source_type in ('uploaded', 'generated', 'tailored')),
  target_role text,
  file_name text,
  content_type text check (content_type is null or content_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  s3_object_key text,
  structured_content jsonb not null default '{}'::jsonb,
  score smallint check (score is null or score between 0 and 100),
  status text not null default 'ready' check (status in ('draft', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_documents_structured_content_object check (jsonb_typeof(structured_content) = 'object'),
  constraint resume_documents_uploaded_file_required check (source_type <> 'uploaded' or s3_object_key is not null),
  constraint resume_documents_profile_owner_fkey foreign key (profile_id, clerk_user_id)
    references public.student_profiles (id, clerk_user_id) on delete cascade,
  constraint resume_documents_id_profile_owner_unique unique (id, profile_id, clerk_user_id),
  constraint resume_documents_id_owner_unique unique (id, clerk_user_id)
);

create unique index resume_documents_s3_object_key_unique
  on public.resume_documents (s3_object_key)
  where s3_object_key is not null;

create table public.profile_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  clerk_user_id text not null,
  item_type text not null check (item_type in (
    'experience', 'project', 'education', 'skill', 'certification',
    'achievement', 'publication', 'extracurricular'
  )),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_items_content_object check (jsonb_typeof(content) = 'object'),
  constraint profile_items_profile_owner_fkey foreign key (profile_id, clerk_user_id)
    references public.student_profiles (id, clerk_user_id) on delete cascade,
  constraint profile_items_id_profile_owner_unique unique (id, profile_id, clerk_user_id),
  constraint profile_items_id_owner_unique unique (id, clerk_user_id)
);

create table public.profile_item_sources (
  id uuid primary key default gen_random_uuid(),
  profile_item_id uuid not null,
  profile_id uuid not null,
  resume_document_id uuid not null,
  clerk_user_id text not null,
  source_excerpt text,
  created_at timestamptz not null default now(),
  constraint profile_item_sources_item_fkey foreign key (profile_item_id, profile_id, clerk_user_id)
    references public.profile_items (id, profile_id, clerk_user_id) on delete cascade,
  constraint profile_item_sources_resume_fkey foreign key (resume_document_id, profile_id, clerk_user_id)
    references public.resume_documents (id, profile_id, clerk_user_id) on delete cascade,
  constraint profile_item_sources_unique unique (profile_item_id, resume_document_id)
);

create table public.profile_import_proposals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  clerk_user_id text not null,
  source_resume_document_id uuid not null,
  target_profile_item_id uuid,
  item_type text not null check (item_type in (
    'experience', 'project', 'education', 'skill', 'certification',
    'achievement', 'publication', 'extracurricular'
  )),
  proposed_data jsonb not null,
  decision text not null default 'pending' check (decision in ('pending', 'accepted', 'skipped')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint profile_import_proposals_data_object check (jsonb_typeof(proposed_data) = 'object'),
  constraint profile_import_proposals_profile_fkey foreign key (profile_id, clerk_user_id)
    references public.student_profiles (id, clerk_user_id) on delete cascade,
  constraint profile_import_proposals_source_fkey foreign key (source_resume_document_id, profile_id, clerk_user_id)
    references public.resume_documents (id, profile_id, clerk_user_id) on delete cascade,
  constraint profile_import_proposals_target_fkey foreign key (target_profile_item_id, profile_id, clerk_user_id)
    references public.profile_items (id, profile_id, clerk_user_id) on delete set null (target_profile_item_id)
);

create table public.resume_document_items (
  id uuid primary key default gen_random_uuid(),
  resume_document_id uuid not null,
  profile_item_id uuid not null,
  profile_id uuid not null,
  clerk_user_id text not null,
  position integer not null check (position >= 0),
  tailored_content jsonb,
  created_at timestamptz not null default now(),
  constraint resume_document_items_resume_fkey foreign key (resume_document_id, profile_id, clerk_user_id)
    references public.resume_documents (id, profile_id, clerk_user_id) on delete cascade,
  constraint resume_document_items_profile_item_fkey foreign key (profile_item_id, profile_id, clerk_user_id)
    references public.profile_items (id, profile_id, clerk_user_id) on delete restrict,
  constraint resume_document_items_tailored_object check (tailored_content is null or jsonb_typeof(tailored_content) = 'object'),
  constraint resume_document_items_position_unique unique (resume_document_id, position),
  constraint resume_document_items_item_unique unique (resume_document_id, profile_item_id)
);

create table public.resume_feedback (
  id uuid primary key default gen_random_uuid(),
  resume_document_id uuid not null,
  clerk_user_id text not null,
  feedback_type text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint resume_feedback_result_object check (jsonb_typeof(result) = 'object'),
  constraint resume_feedback_resume_owner_fkey foreign key (resume_document_id, clerk_user_id)
    references public.resume_documents (id, clerk_user_id) on delete cascade
);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  saved_job_id uuid,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint application_events_details_object check (jsonb_typeof(details) = 'object'),
  constraint application_events_job_owner_fkey foreign key (saved_job_id, clerk_user_id)
    references public.saved_jobs (id, clerk_user_id) on delete cascade
);

create table public.course_progress (
  clerk_user_id text not null,
  course_code text not null,
  category text not null,
  course_name text not null,
  match_score numeric(5,2) not null default 0 check (match_score between 0 and 100),
  is_selected boolean not null default false,
  match_details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, course_code),
  constraint course_progress_details_object check (jsonb_typeof(match_details) = 'object')
);

create index saved_jobs_user_stage_saved_idx on public.saved_jobs (clerk_user_id, stage, saved_at desc);
create index resume_documents_user_created_idx on public.resume_documents (clerk_user_id, created_at desc);
create index profile_items_profile_order_idx on public.profile_items (profile_id, item_type, sort_order);
create index profile_items_user_verification_idx on public.profile_items (clerk_user_id, verification_status);
create index profile_item_sources_item_idx on public.profile_item_sources (profile_item_id, clerk_user_id);
create index profile_item_sources_resume_idx on public.profile_item_sources (resume_document_id, clerk_user_id);
create index profile_import_proposals_status_idx on public.profile_import_proposals (clerk_user_id, decision, created_at desc);
create index resume_document_items_item_idx on public.resume_document_items (profile_item_id, clerk_user_id);
create index resume_feedback_document_created_idx on public.resume_feedback (resume_document_id, clerk_user_id, created_at desc);
create index application_events_user_occurred_idx on public.application_events (clerk_user_id, occurred_at desc);
create index application_events_job_idx on public.application_events (saved_job_id, clerk_user_id);
create index course_progress_user_category_idx on public.course_progress (clerk_user_id, category, is_selected);

-- A server-side atomic counter so concurrent requests cannot exceed a daily limit.
-- SECURITY INVOKER preserves the caller's RLS context.
create function public.consume_daily_usage(p_feature text, p_daily_limit integer)
returns table (allowed boolean, used integer, remaining integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clerk_user_id text := (select auth.jwt() ->> 'sub');
  v_count integer;
begin
  if v_clerk_user_id is null then
    raise exception 'A signed-in Clerk user is required' using errcode = '42501';
  end if;
  if p_feature not in ('analyzeMatch', 'tailorResume') or p_daily_limit < 1 then
    raise exception 'Invalid feature or daily limit' using errcode = '22023';
  end if;

  insert into public.daily_usage (clerk_user_id, usage_date, feature, count)
  values (v_clerk_user_id, (now() at time zone 'utc')::date, p_feature, 1)
  on conflict (clerk_user_id, usage_date, feature)
  do update set count = public.daily_usage.count + 1, updated_at = now()
  where public.daily_usage.count < p_daily_limit
  returning public.daily_usage.count into v_count;

  if v_count is null then
    select du.count into v_count
    from public.daily_usage as du
    where du.clerk_user_id = v_clerk_user_id
      and du.usage_date = (now() at time zone 'utc')::date
      and du.feature = p_feature;
    return query select false, v_count, greatest(p_daily_limit - v_count, 0);
  else
    return query select true, v_count, greatest(p_daily_limit - v_count, 0);
  end if;
end;
$$;

revoke all on function public.consume_daily_usage(text, integer) from public, anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.student_profiles,
  public.saved_jobs,
  public.user_preferences,
  public.user_settings,
  public.daily_usage,
  public.resume_documents,
  public.profile_items,
  public.profile_item_sources,
  public.profile_import_proposals,
  public.resume_document_items,
  public.resume_feedback,
  public.application_events,
  public.course_progress
to authenticated;
revoke all on table
  public.student_profiles,
  public.saved_jobs,
  public.user_preferences,
  public.user_settings,
  public.daily_usage,
  public.resume_documents,
  public.profile_items,
  public.profile_item_sources,
  public.profile_import_proposals,
  public.resume_document_items,
  public.resume_feedback,
  public.application_events,
  public.course_progress
from anon;
grant execute on function public.consume_daily_usage(text, integer) to authenticated;

do $$
declare
  table_name text;
  table_names text[] := array[
    'student_profiles', 'saved_jobs', 'user_preferences', 'user_settings', 'daily_usage',
    'resume_documents', 'profile_items', 'profile_item_sources', 'profile_import_proposals',
    'resume_document_items', 'resume_feedback', 'application_events', 'course_progress'
  ];
begin
  foreach table_name in array table_names loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (clerk_user_id = (select auth.jwt() ->> ''sub'')) with check (clerk_user_id = (select auth.jwt() ->> ''sub''))',
      table_name || '_clerk_user_policy', table_name
    );
  end loop;
end;
$$;
