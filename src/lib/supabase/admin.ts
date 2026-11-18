import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

/**
 * A Supabase client with the project's secret key: it skips RLS, so it is
 * for the few writes a student must not be able to make themselves (today:
 * People cards). `server-only` stops it from ever reaching a browser bundle.
 *
 * Always scope its queries to the Clerk user id from `auth()`, never to one
 * taken from a request body.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = secretKeyFromEnv()
  if (!url || !secretKey) throw new AdminClientMissingError()
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/**
 * SUPABASE_SECRET_KEY, or the older SUPABASE_KEY name some setups already
 * use. Only a secret key (`sb_secret_…`) is accepted from the old name, so a
 * publishable key put there by mistake can't masquerade as the server's.
 */
function secretKeyFromEnv() {
  const named = process.env.SUPABASE_SECRET_KEY?.trim()
  if (named) return named
  const legacy = process.env.SUPABASE_KEY?.trim()
  return legacy?.startsWith("sb_secret_") ? legacy : undefined
}

export class AdminClientMissingError extends Error {
  constructor() {
    super("SUPABASE_SECRET_KEY is not set, so People cards can't be saved.")
    this.name = "AdminClientMissingError"
  }
}
