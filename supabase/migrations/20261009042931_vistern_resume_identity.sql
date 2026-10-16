-- Stable profile-item identities let full-profile edits update items without
-- replacing IDs that are referenced by resume snapshots.
alter table public.profile_items add column identity_key text;
update public.profile_items set identity_key = id::text where identity_key is null;
alter table public.profile_items alter column identity_key set not null;
create unique index profile_items_identity_unique
  on public.profile_items (profile_id, clerk_user_id, item_type, identity_key);

-- Track the selected resume independently from the canonical profile.
alter table public.resume_documents
  add column is_current boolean not null default false,
  add column is_starred boolean not null default false;
create unique index resume_documents_one_current_per_user
  on public.resume_documents (clerk_user_id)
  where is_current;

-- The uploader also accepts legacy .doc and plain-text files.
alter table public.resume_documents
  drop constraint if exists resume_documents_content_type_check;
alter table public.resume_documents
  add constraint resume_documents_content_type_check
  check (content_type is null or content_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ));
