-- Cover composite foreign keys so parent deletes/updates do not scan child tables.
create index resume_documents_profile_owner_idx
  on public.resume_documents (profile_id, clerk_user_id);
create index profile_items_profile_owner_idx
  on public.profile_items (profile_id, clerk_user_id);
create index profile_item_sources_item_owner_idx
  on public.profile_item_sources (profile_item_id, profile_id, clerk_user_id);
create index profile_item_sources_resume_owner_idx
  on public.profile_item_sources (resume_document_id, profile_id, clerk_user_id);
create index profile_import_proposals_profile_owner_idx
  on public.profile_import_proposals (profile_id, clerk_user_id);
create index profile_import_proposals_source_owner_idx
  on public.profile_import_proposals (source_resume_document_id, profile_id, clerk_user_id);
create index profile_import_proposals_target_owner_idx
  on public.profile_import_proposals (target_profile_item_id, profile_id, clerk_user_id);
create index resume_document_items_resume_owner_idx
  on public.resume_document_items (resume_document_id, profile_id, clerk_user_id);
create index resume_document_items_profile_item_owner_idx
  on public.resume_document_items (profile_item_id, profile_id, clerk_user_id);

-- Evaluate the JWT claim once per statement rather than once per row.
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
    execute format('drop policy if exists %I on public.%I', table_name || '_clerk_user_policy', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (clerk_user_id = ((select auth.jwt()) ->> ''sub'')) with check (clerk_user_id = ((select auth.jwt()) ->> ''sub''))',
      table_name || '_clerk_user_policy', table_name
    );
  end loop;
end;
$$;
