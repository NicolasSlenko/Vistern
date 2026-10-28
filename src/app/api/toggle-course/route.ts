import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { courseCode, category, courseName, action } = await request.json();
    if (typeof courseCode !== "string" || typeof category !== "string" || !["check", "uncheck"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid course update" }, { status: 400 });
    }
    const supabase = await createClerkSupabaseServerClient();
    const { error } = await supabase.from("course_progress").upsert({
      clerk_user_id: userId,
      course_code: courseCode,
      course_name: typeof courseName === "string" ? courseName : courseCode,
      category,
      is_selected: action === "check",
      match_score: action === "check" ? 100 : 0,
      match_details: { manual: true },
      updated_at: new Date().toISOString(),
    }, { onConflict: "clerk_user_id,course_code" });
    if (error) throw error;

    const { data: selected, error: readError } = await supabase.from("course_progress")
      .select("course_code,course_name,category,match_score,match_details")
      .eq("clerk_user_id", userId).eq("is_selected", true);
    if (readError) throw readError;
    const byCategory: Record<string, Array<{ resumeCourse: string; ufCourse: { name: string; code: string }; score: number; category: string }>> = {};
    for (const row of selected ?? []) {
      const details = row.match_details && typeof row.match_details === "object" && !Array.isArray(row.match_details)
        ? row.match_details as Record<string, unknown> : {};
      const match = {
        resumeCourse: typeof details.resumeCourse === "string" ? details.resumeCourse : row.course_name,
        ufCourse: { name: typeof details.ufCourseName === "string" ? details.ufCourseName : row.course_name, code: row.course_code },
        score: row.match_score,
        category: row.category,
      };
      (byCategory[row.category] ??= []).push(match);
    }
    return NextResponse.json({ success: true, message: `Course ${action === "check" ? "checked" : "unchecked"} successfully`, byCategory });
  } catch (error) {
    console.error("Error toggling course:", error);
    return NextResponse.json({ success: false, error: "Failed to toggle course" }, { status: 500 });
  }
}
