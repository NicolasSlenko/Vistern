import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const supabase = await createClerkSupabaseServerClient();
    const { data, error } = await supabase.from("course_progress")
      .select("course_code,course_name,category,match_score,match_details,is_selected,updated_at")
      .eq("clerk_user_id", userId).order("category").order("course_name");
    if (error) throw error;
    const matches = data.map((row) => {
      const details = row.match_details && typeof row.match_details === "object" && !Array.isArray(row.match_details)
        ? row.match_details as Record<string, unknown> : {};
      return {
        resumeCourse: typeof details.resumeCourse === "string" ? details.resumeCourse : row.course_name,
        ufCourse: { name: typeof details.ufCourseName === "string" ? details.ufCourseName : row.course_name, code: row.course_code },
        score: row.match_score,
        category: row.category,
        isSelected: row.is_selected,
      };
    });
    const byCategory: Record<string, typeof matches> = {};
    for (const match of matches) {
      if (match.isSelected) (byCategory[match.category] ??= []).push(match);
    }
    return NextResponse.json({ success: true, matches, byCategory, totalMatches: matches.length, lastUpdated: data[0]?.updated_at });
  } catch (error) {
    console.error("Error reading matched courses:", error);
    return NextResponse.json({ success: false, error: "Failed to read matched courses" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const supabase = await createClerkSupabaseServerClient();
    const { error } = await supabase.from("course_progress").delete().eq("clerk_user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true, message: "Matched courses cleared" });
  } catch (error) {
    console.error("Error deleting matched courses:", error);
    return NextResponse.json({ success: false, error: "Failed to clear matched courses" }, { status: 500 });
  }
}
