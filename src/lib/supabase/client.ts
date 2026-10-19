"use client";

import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import type { Database } from "./database.types";

/**
 * Create a Supabase client that sends the current Clerk session token so
 * Supabase Row Level Security can authorize the signed-in student.
 */
export function useSupabaseClient() {
  const { session } = useSession();

  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
    }

    return createClient<Database>(url, publishableKey, {
      accessToken: async () => session?.getToken() ?? null,
    });
  }, [session]);
}
