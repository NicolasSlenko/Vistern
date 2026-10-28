export const ACCOUNT_DATA_TABLES = [
  "application_events",
  "saved_jobs",
  "resume_feedback",
  "resume_document_items",
  "profile_item_sources",
  "profile_import_proposals",
  "resume_documents",
  "profile_items",
  "career_workspaces",
  "course_progress",
  "daily_usage",
  "legacy_import_state",
  "user_preferences",
  "user_settings",
  "student_profiles",
] as const

export type AccountDataTable = (typeof ACCOUNT_DATA_TABLES)[number]

export interface AccountDeletionServices {
  listObjects(prefix: string): Promise<string[]>
  deleteObjects(keys: string[]): Promise<void>
  deleteRows(table: AccountDataTable, userId: string): Promise<void>
  countRows(table: AccountDataTable, userId: string): Promise<number>
  deleteIdentity(userId: string): Promise<void>
}

/**
 * Keep the identity until storage and database cleanup are confirmed. A failed
 * step leaves the user able to retry, rather than orphaning private data.
 */
export async function deleteAccountData(userId: string, services: AccountDeletionServices) {
  const prefix = `uploads/${userId}/`
  const objects = await services.listObjects(prefix)
  await services.deleteObjects(objects)

  if ((await services.listObjects(prefix)).length !== 0) {
    throw new Error("Some uploaded files remain. Your account was not deleted; please try again.")
  }

  for (const table of ACCOUNT_DATA_TABLES) {
    await services.deleteRows(table, userId)
  }

  for (const table of ACCOUNT_DATA_TABLES) {
    if ((await services.countRows(table, userId)) !== 0) {
      throw new Error("Some account data remains. Your account was not deleted; please try again.")
    }
  }

  await services.deleteIdentity(userId)
}
