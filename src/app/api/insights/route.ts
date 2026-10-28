import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getJsonFromS3 } from "@/lib/aws/s3";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentResumeData } from "@/lib/supabase/user-data";
import { userInsightsSchema, type UserInsights } from "./insightsSchema";
import type { Json } from "@/lib/supabase/database.types";

const legacyInsightsKey = (userId: string) => `uploads/${userId}/insights.json`;

async function getCurrentDocumentId(userId: string, supabase: Awaited<ReturnType<typeof createClerkSupabaseServerClient>>) {
  await getCurrentResumeData(userId); // Imports the legacy current resume before looking up its document.
  const { data, error } = await supabase
    .from("resume_documents")
    .select("id")
    .eq("clerk_user_id", userId)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function readInsights(userId: string, documentId: string) {
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase
    .from("resume_feedback")
    .select("id,result")
    .eq("clerk_user_id", userId)
    .eq("resume_document_id", documentId)
    .eq("feedback_type", "insights")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return { supabase, row: data, value: data.result as unknown as UserInsights };

  const legacy = await getJsonFromS3<UserInsights>(legacyInsightsKey(userId));
  if (!legacy) return { supabase, row: null, value: null };
  const { data: imported, error: importError } = await supabase
    .from("resume_feedback")
    .insert({
      clerk_user_id: userId,
      resume_document_id: documentId,
      feedback_type: "insights",
      result: legacy as unknown as Json,
    })
    .select("id,result")
    .single();
  if (importError) throw importError;
  return { supabase, row: imported, value: legacy };
}

async function saveInsights(
  userId: string,
  documentId: string,
  supabase: Awaited<ReturnType<typeof createClerkSupabaseServerClient>>,
  existingId: string | null,
  value: UserInsights,
) {
  if (existingId) {
    const { error } = await supabase.from("resume_feedback").update({ result: value as unknown as Json })
      .eq("id", existingId).eq("clerk_user_id", userId).eq("resume_document_id", documentId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("resume_feedback").insert({
    clerk_user_id: userId,
    resume_document_id: documentId,
    feedback_type: "insights",
    result: value as unknown as Json,
  });
  if (error) throw error;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    const supabase = await createClerkSupabaseServerClient();
    const documentId = await getCurrentDocumentId(userId, supabase);
    if (!documentId) return NextResponse.json({ success: true, data: null });
    const result = await readInsights(userId, documentId);
    return NextResponse.json({ success: true, data: result.value });
  } catch (error) {
    console.error("Error loading insights:", error);
    return NextResponse.json({ success: false, data: null, error: "Failed to load insights" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = await request.json();
    const insights = userInsightsSchema.parse({
      insights: payload.insights,
      generatedAt: payload.generatedAt || new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });
    const supabase = await createClerkSupabaseServerClient();
    const documentId = await getCurrentDocumentId(userId, supabase);
    if (!documentId) return NextResponse.json({ success: false, error: "No current resume found" }, { status: 409 });
    const existing = await readInsights(userId, documentId);
    await saveInsights(userId, documentId, existing.supabase, existing.row?.id ?? null, insights);
    return NextResponse.json({ success: true, message: "Insights saved successfully" });
  } catch (error) {
    console.error("Error saving insights:", error);
    const status = error instanceof Error && "issues" in error ? 400 : 500;
    return NextResponse.json({ success: false, error: status === 400 ? "Invalid insights payload" : "Failed to save insights" }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { insightIds, checked } = await request.json() as { insightIds: string[]; checked: boolean };
    if (!Array.isArray(insightIds) || typeof checked !== "boolean") {
      return NextResponse.json({ success: false, error: "Invalid insight update" }, { status: 400 });
    }
    const supabase = await createClerkSupabaseServerClient();
    const documentId = await getCurrentDocumentId(userId, supabase);
    if (!documentId) return NextResponse.json({ success: false, error: "No current resume found" }, { status: 404 });
    const existing = await readInsights(userId, documentId);
    if (!existing.value) return NextResponse.json({ success: false, error: "No insights found to update" }, { status: 404 });
    const updated: UserInsights = {
      ...existing.value,
      insights: existing.value.insights.map((insight) => insightIds.includes(insight.id) ? { ...insight, checked } : insight),
      lastUpdatedAt: new Date().toISOString(),
    };
    await saveInsights(userId, documentId, existing.supabase, existing.row?.id ?? null, updated);
    return NextResponse.json({ success: true, message: "Insights updated successfully" });
  } catch (error) {
    console.error("Error updating insights:", error);
    return NextResponse.json({ success: false, error: "Failed to update insights" }, { status: 500 });
  }
}
