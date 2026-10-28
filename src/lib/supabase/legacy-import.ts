import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type LegacyDataset =
  Database["public"]["Tables"]["legacy_import_state"]["Row"]["dataset"];

export async function hasImportedLegacyDataset(
  supabase: SupabaseClient<Database>,
  clerkUserId: string,
  dataset: LegacyDataset,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("legacy_import_state")
    .select("dataset")
    .eq("clerk_user_id", clerkUserId)
    .eq("dataset", dataset)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function markLegacyDatasetImported(
  supabase: SupabaseClient<Database>,
  clerkUserId: string,
  dataset: LegacyDataset,
  rowsImported: number,
): Promise<void> {
  const { error } = await supabase.from("legacy_import_state").upsert(
    {
      clerk_user_id: clerkUserId,
      dataset,
      rows_imported: rowsImported,
    },
    { onConflict: "clerk_user_id,dataset" },
  );

  if (error) throw error;
}
