import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type ProposalData = {
  title?: unknown;
  content?: unknown;
  identity_key?: unknown;
  sort_order?: unknown;
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const supabase = await createClerkSupabaseServerClient();
    const { data, error } = await supabase
      .from("profile_import_proposals")
      .select("id, item_type, proposed_data, source_resume_document_id, target_profile_item_id, created_at")
      .eq("clerk_user_id", userId)
      .eq("decision", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const sourceIds = [...new Set((data ?? []).map((proposal) => proposal.source_resume_document_id))];
    let fileNames = new Map<string, string | null>();
    if (sourceIds.length) {
      const { data: documents, error: documentsError } = await supabase
        .from("resume_documents")
        .select("id, file_name")
        .eq("clerk_user_id", userId)
        .in("id", sourceIds);
      if (documentsError) throw documentsError;
      fileNames = new Map((documents ?? []).map((document) => [document.id, document.file_name]));
    }

    return NextResponse.json({
      success: true,
      data: (data ?? []).map((proposal) => ({ ...proposal, source_file_name: fileNames.get(proposal.source_resume_document_id) ?? null })),
    });
  } catch (error) {
    console.error("Error loading profile import proposals:", error);
    return NextResponse.json({ success: false, error: "Failed to load profile suggestions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const proposalId = typeof body.proposalId === "string" ? body.proposalId : "";
    const decision = body.decision;
    if (!proposalId || (decision !== "accepted" && decision !== "skipped")) {
      return NextResponse.json({ success: false, error: "Provide a proposalId and accepted or skipped decision." }, { status: 400 });
    }

    const supabase = await createClerkSupabaseServerClient();
    const { data: proposal, error: proposalError } = await supabase
      .from("profile_import_proposals")
      .select("id, profile_id, item_type, proposed_data, source_resume_document_id, decision")
      .eq("id", proposalId)
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (proposalError) throw proposalError;
    if (!proposal) return NextResponse.json({ success: false, error: "Suggestion not found" }, { status: 404 });
    if (proposal.decision !== "pending") return NextResponse.json({ success: false, error: "Suggestion has already been decided" }, { status: 409 });

    let targetItemId: string | null = null;
    if (decision === "accepted") {
      const proposed = proposal.proposed_data as ProposalData;
      if (
        typeof proposed.title !== "string" ||
        typeof proposed.identity_key !== "string" ||
        !proposed.content || typeof proposed.content !== "object" || Array.isArray(proposed.content)
      ) {
        return NextResponse.json({ success: false, error: "Suggestion data is invalid" }, { status: 422 });
      }

      const { data: item, error: itemError } = await supabase
        .from("profile_items")
        .upsert({
          profile_id: proposal.profile_id,
          clerk_user_id: userId,
          item_type: proposal.item_type,
          title: proposed.title,
          content: proposed.content as Json,
          identity_key: proposed.identity_key,
          sort_order: typeof proposed.sort_order === "number" ? proposed.sort_order : 0,
          verification_status: "verified",
        }, { onConflict: "profile_id,clerk_user_id,item_type,identity_key" })
        .select("id")
        .single();
      if (itemError) throw itemError;
      targetItemId = item.id;

      const { data: source, error: sourceLookupError } = await supabase
        .from("profile_item_sources")
        .select("id")
        .eq("profile_item_id", targetItemId)
        .eq("resume_document_id", proposal.source_resume_document_id)
        .eq("clerk_user_id", userId)
        .maybeSingle();
      if (sourceLookupError) throw sourceLookupError;
      if (!source) {
        const { error: sourceInsertError } = await supabase.from("profile_item_sources").insert({
          profile_id: proposal.profile_id,
          clerk_user_id: userId,
          profile_item_id: targetItemId,
          resume_document_id: proposal.source_resume_document_id,
        });
        if (sourceInsertError) throw sourceInsertError;
      }
    }

    const { error: decisionError } = await supabase
      .from("profile_import_proposals")
      .update({ decision, decided_at: new Date().toISOString(), target_profile_item_id: targetItemId })
      .eq("id", proposalId)
      .eq("clerk_user_id", userId)
      .eq("decision", "pending");
    if (decisionError) throw decisionError;

    return NextResponse.json({ success: true, decision, profileItemId: targetItemId });
  } catch (error) {
    console.error("Error deciding profile import proposal:", error);
    return NextResponse.json({ success: false, error: "Failed to save suggestion decision" }, { status: 500 });
  }
}
