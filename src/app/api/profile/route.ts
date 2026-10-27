import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteFromS3, getJsonFromS3 } from "@/lib/aws/s3";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import { hasImportedLegacyDataset, markLegacyDatasetImported } from "@/lib/supabase/legacy-import";
import { normalizeProfileData, profileItemsFromResume, resumeFromProfileItems } from "@/lib/profile/profile-data";
import type { Json } from "@/lib/supabase/database.types";
import { getResumeObject } from "@/app/api/parse/resumeSchema";

async function readLegacyMasterProfile(userId: string) {
  const saved = await getJsonFromS3<unknown>(`uploads/${userId}/master-profile.json`);
  if (saved && typeof saved === "object" && "details" in saved && !("experience" in saved)) {
    return (saved as { details: unknown }).details;
  }
  return saved;
}

async function getOrImportProfile(userId: string) {
  const supabase = await createClerkSupabaseServerClient();
  let { data: profile, error } = await supabase
    .from("student_profiles")
    .select("id, basics")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (error) throw error;

  if (!profile) {
    const imported = await readLegacyMasterProfile(userId);
    const initial = normalizeProfileData(imported);
    const { data: created, error: createError } = await supabase
      .from("student_profiles")
      .insert({ clerk_user_id: userId, basics: initial.basics as unknown as Json })
      .select("id, basics")
      .single();
    if (createError) throw createError;
    profile = created;
  }

  if (!(await hasImportedLegacyDataset(supabase, userId, "profile"))) {
    const legacy = await readLegacyMasterProfile(userId);
    if (legacy) {
      const items = profileItemsFromResume(normalizeProfileData(legacy)).map((item) => ({
        ...item,
        profile_id: profile!.id,
        clerk_user_id: userId,
      }));
      if (items.length) {
        const { error: importError } = await supabase
          .from("profile_items")
          .upsert(items, { onConflict: "profile_id,clerk_user_id,item_type,identity_key" });
        if (importError) throw importError;
      }
    }
    await markLegacyDatasetImported(supabase, userId, "profile", 1);
  }

  const { data: rows, error: itemsError } = await supabase
    .from("profile_items")
    .select("item_type, title, content, sort_order")
    .eq("profile_id", profile.id)
    .eq("clerk_user_id", userId)
    .neq("verification_status", "archived")
    .order("item_type")
    .order("sort_order");
  if (itemsError) throw itemsError;

  return {
    supabase,
    profile,
    data: resumeFromProfileItems(profile.basics, rows ?? []),
  };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { data } = await getOrImportProfile(userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching master profile:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch master profile" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const data = normalizeProfileData(await request.json());
    const { supabase, profile } = await getOrImportProfile(userId);
    const { error: profileError } = await supabase
      .from("student_profiles")
      .update({ basics: data.basics as unknown as Json, updated_at: new Date().toISOString() })
      .eq("id", profile.id)
      .eq("clerk_user_id", userId);
    if (profileError) throw profileError;

    const items = profileItemsFromResume(data).map((item) => ({
      ...item,
      profile_id: profile.id,
      clerk_user_id: userId,
    }));
    if (items.length) {
      const { error: saveError } = await supabase
        .from("profile_items")
        .upsert(items, { onConflict: "profile_id,clerk_user_id,item_type,identity_key" });
      if (saveError) throw saveError;
    }

    const incomingKeys = items.map((item) => item.identity_key);
    let archiveQuery = supabase
      .from("profile_items")
      .update({ verification_status: "archived" })
      .eq("profile_id", profile.id)
      .eq("clerk_user_id", userId)
      .eq("verification_status", "verified");
    if (incomingKeys.length) archiveQuery = archiveQuery.not("identity_key", "in", `(${incomingKeys.join(",")})`);
    const { error: archiveError } = await archiveQuery;
    if (archiveError) throw archiveError;

    await markLegacyDatasetImported(supabase, userId, "profile", items.length);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error saving master profile:", error);
    return NextResponse.json({ success: false, error: "Failed to save master profile" }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (body?.confirmation !== "CLEAR") {
    return NextResponse.json({ success: false, error: "Type CLEAR to confirm." }, { status: 400 });
  }

  try {
    const supabase = await createClerkSupabaseServerClient();
    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (profileError) throw profileError;

    // An old S3 snapshot must not refill the profile on its next GET.
    await deleteFromS3(`uploads/${userId}/master-profile.json`);

    if (profile) {
      for (const table of ["resume_document_items", "profile_item_sources", "profile_import_proposals", "profile_items"] as const) {
        const { error } = await supabase.from(table).delete().eq("clerk_user_id", userId).eq("profile_id", profile.id);
        if (error) throw error;
      }

      const empty = getResumeObject();
      const { error: updateError } = await supabase
        .from("student_profiles")
        .update({ basics: empty.basics as unknown as Json, updated_at: new Date().toISOString() })
        .eq("id", profile.id)
        .eq("clerk_user_id", userId);
      if (updateError) throw updateError;

      const { count, error: verifyError } = await supabase
        .from("profile_items")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .eq("clerk_user_id", userId);
      if (verifyError || count !== 0) throw verifyError ?? new Error("Profile items remain");
    }

    await markLegacyDatasetImported(supabase, userId, "profile", 0);
    return NextResponse.json({ success: true, data: getResumeObject() });
  } catch (error) {
    console.error("Error clearing master profile:", error);
    return NextResponse.json({ success: false, error: "Could not clear your profile. Please try again." }, { status: 500 });
  }
}
