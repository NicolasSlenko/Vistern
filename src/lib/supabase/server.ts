import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Create a request-scoped Supabase client using the caller's Clerk session.
 * Database RLS remains responsible for enforcing row ownership.
 */
export async function createClerkSupabaseServerClient() {
  const { userId, getToken } = await auth();

  if (!userId) {
    throw new Error("A signed-in Clerk user is required to access Supabase.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return createClient<Database>(url, publishableKey, {
    accessToken: () => getToken(),
  });
}
