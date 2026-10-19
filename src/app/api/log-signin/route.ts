import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClerkSupabaseServerClient();
    const { error } = await supabase.from("application_events").insert({
      clerk_user_id: userId,
      event_type: "sign_in",
      details: { userAgent: request.headers.get("user-agent") || "unknown" } as Json,
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging sign-in event:", error);
    return NextResponse.json({ error: "Failed to log sign-in" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClerkSupabaseServerClient();
    const { data, error } = await supabase
      .from("application_events")
      .select("occurred_at,details")
      .eq("clerk_user_id", userId)
      .eq("event_type", "sign_in")
      .order("occurred_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: (data ?? []).map((event) => ({
        timestamp: event.occurred_at,
        userAgent: typeof event.details === "object" && event.details && "userAgent" in event.details
          ? event.details.userAgent
          : "unknown",
      })),
    });
  } catch (error) {
    console.error("Error fetching sign-in events:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
