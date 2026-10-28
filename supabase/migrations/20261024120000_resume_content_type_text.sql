-- The upload form accepts PDF, DOCX and TXT, and the parser reads all three,
-- but resume_documents.content_type only permitted the first two. A plain-text
-- resume therefore parsed cleanly and then failed on save with a constraint
-- violation the student saw as "Failed to save resume data".
--
-- Widened to match what the application actually accepts.

alter table public.resume_documents
  drop constraint if exists resume_documents_content_type_check;

alter table public.resume_documents
  add constraint resume_documents_content_type_check
  check (
    content_type is null
    or content_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    )
  );
