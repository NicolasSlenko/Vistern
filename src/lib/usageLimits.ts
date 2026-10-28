import { getJsonFromS3 } from "@/lib/aws/s3";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import {
  hasImportedLegacyDataset,
  markLegacyDatasetImported,
} from "@/lib/supabase/legacy-import";

export type LimitKey = "analyzeMatch" | "tailorResume" | "paidAi";

interface DailyCount {
  date: string;
  count: number;
}

// Legacy S3 shape; paidAi postdates it, so old records never have it.
interface UsageData {
  analyzeMatch: DailyCount;
  tailorResume: DailyCount;
  paidAi?: DailyCount;
}

const LIMITS: Record<LimitKey, number> = {
  analyzeMatch: 10,
  tailorResume: 10,
  // Requests per day on paid AI providers (OpenAI / Claude); HiPerGator is unlimited.
  paidAi: Number(process.env.PAID_AI_DAILY_LIMIT) || 20,
};

function isOwner(userId: string): boolean {
  const ownerId = process.env.OWNER_CLERK_USER_ID;
  return !!ownerId && userId === ownerId;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

async function ensureLegacyUsageImported(userId: string) {
  const supabase = await createClerkSupabaseServerClient();
  if (await hasImportedLegacyDataset(supabase, userId, "usage")) return supabase;

  const today = todayStr();
  const stored = await getJsonFromS3<UsageData>(`uploads/${userId}/usage-limits.json`);
  const rows = (Object.keys(LIMITS) as LimitKey[])
    .filter((feature) => stored?.[feature]?.date === today)
    .map((feature) => ({
      clerk_user_id: userId,
      usage_date: today,
      feature,
      count: Math.max(0, Math.floor(stored?.[feature]?.count ?? 0)),
    }));

  if (rows.length) {
    const { error } = await supabase.from("daily_usage").upsert(rows, {
      onConflict: "clerk_user_id,usage_date,feature",
    });
    if (error) throw error;
  }

  await markLegacyDatasetImported(supabase, userId, "usage", rows.length);
  return supabase;
}

/** Returns { allowed, remaining } and atomically increments the daily counter. */
export async function checkAndIncrementLimit(
  userId: string,
  key: LimitKey,
): Promise<{ allowed: boolean; remaining: number }> {
  if (isOwner(userId)) return { allowed: true, remaining: 999 };

  const supabase = await ensureLegacyUsageImported(userId);
  const { data, error } = await supabase.rpc("consume_daily_usage", {
    p_feature: key,
    p_daily_limit: LIMITS[key],
  });
  if (error) throw error;

  const usage = data?.[0];
  if (!usage) throw new Error("Supabase did not return a usage result.");
  return { allowed: usage.allowed, remaining: usage.remaining };
}

export async function getUsageSummary(userId: string) {
  if (isOwner(userId)) {
    return {
      analyzeMatch: { used: 0, limit: 999, remaining: 999 },
      tailorResume: { used: 0, limit: 999, remaining: 999 },
      paidAi: { used: 0, limit: 999, remaining: 999 },
      isOwner: true,
    };
  }

  const supabase = await ensureLegacyUsageImported(userId);
  const { data, error } = await supabase
    .from("daily_usage")
    .select("feature,count")
    .eq("clerk_user_id", userId)
    .eq("usage_date", todayStr());
  if (error) throw error;

  const usedByFeature = Object.fromEntries(
    (data ?? []).map((row) => [row.feature, row.count]),
  ) as Partial<Record<LimitKey, number>>;

  return {
    analyzeMatch: {
      used: usedByFeature.analyzeMatch ?? 0,
      limit: LIMITS.analyzeMatch,
      remaining: Math.max(0, LIMITS.analyzeMatch - (usedByFeature.analyzeMatch ?? 0)),
    },
    tailorResume: {
      used: usedByFeature.tailorResume ?? 0,
      limit: LIMITS.tailorResume,
      remaining: Math.max(0, LIMITS.tailorResume - (usedByFeature.tailorResume ?? 0)),
    },
    paidAi: {
      used: usedByFeature.paidAi ?? 0,
      limit: LIMITS.paidAi,
      remaining: Math.max(0, LIMITS.paidAi - (usedByFeature.paidAi ?? 0)),
    },
    isOwner: false,
  };
}
