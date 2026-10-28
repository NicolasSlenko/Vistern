import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getJsonFromS3 } from "@/lib/aws/s3";
import { createClerkSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  hasImportedLegacyDataset,
  markLegacyDatasetImported,
} from "@/lib/supabase/legacy-import";

export type JobBucket = "interested" | "applied" | "interviewing" | "offer" | "rejected";

export interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  matchScore: number;
  contractType?: string;
  bucket: JobBucket;
  savedAt: number;
}

const LEGACY_KEY = (userId: string) => `uploads/${userId}/job-board.json`;
const JOB_PROVIDER = "vistern";

function normalizeLegacyJob(userId: string, job: SavedJob) {
  const savedAt = new Date(job.savedAt || Date.now());
  return {
    clerk_user_id: userId,
    provider: JOB_PROVIDER,
    external_id: String(job.id),
    title: job.title,
    company: job.company,
    location: job.location ?? "",
    apply_url: job.applyUrl ?? "",
    match_score: Math.max(0, Math.min(100, Math.round(job.matchScore ?? 0))),
    contract_type: job.contractType ?? null,
    stage: job.bucket ?? "interested",
    job_snapshot: job as unknown as Json,
    saved_at: Number.isNaN(savedAt.getTime()) ? new Date().toISOString() : savedAt.toISOString(),
  };
}

function fromDatabaseRow(row: {
  external_id: string;
  title: string;
  company: string;
  location: string;
  apply_url: string;
  match_score: number;
  contract_type: string | null;
  stage: string;
  saved_at: string;
}): SavedJob {
  return {
    id: row.external_id,
    title: row.title,
    company: row.company,
    location: row.location,
    applyUrl: row.apply_url,
    matchScore: row.match_score,
    ...(row.contract_type ? { contractType: row.contract_type } : {}),
    bucket: row.stage as JobBucket,
    savedAt: new Date(row.saved_at).getTime(),
  };
}

/**
 * Most roles one tracker holds. Set explicitly so a large board is a clear
 * message on save, not rows quietly cut off by the database's own row cap.
 */
export const SAVED_JOB_LIMIT = 500;

async function ensureLegacyJobsImported(userId: string) {
  const supabase = await createClerkSupabaseServerClient();
  if (await hasImportedLegacyDataset(supabase, userId, "saved_jobs")) return supabase;
  if (!process.env.AWS_BUCKET_NAME || !process.env.IAM_AWS_ACCESS_KEY || !process.env.IAM_AWS_SECRET_ACCESS_KEY) return supabase;

  const legacy = await getJsonFromS3<{ jobs?: SavedJob[] }>(LEGACY_KEY(userId));
  const jobs = Array.isArray(legacy?.jobs) ? legacy.jobs : [];
  if (jobs.length) {
    const { error } = await supabase.from("saved_jobs").upsert(
      jobs.map((job) => normalizeLegacyJob(userId, job)),
      { onConflict: "clerk_user_id,provider,external_id" },
    );
    if (error) throw error;
  }

  await markLegacyDatasetImported(supabase, userId, "saved_jobs", jobs.length);
  return supabase;
}

export async function getJobs(userId: string): Promise<SavedJob[]> {
  const supabase = await ensureLegacyJobsImported(userId);
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("external_id,title,company,location,apply_url,match_score,contract_type,stage,saved_at")
    .eq("clerk_user_id", userId)
    .eq("provider", JOB_PROVIDER)
    .order("saved_at", { ascending: false })
    .limit(SAVED_JOB_LIMIT);

  if (error) throw error;
  return (data ?? []).map(fromDatabaseRow);
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, data: [] }, { status: 401 });
    return NextResponse.json({ success: true, data: await getJobs(userId) });
  } catch (error) {
    console.error("Failed to load saved jobs from Supabase");
    return NextResponse.json({ success: false, data: [], error: "Failed to load saved jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const job = (await request.json()) as Omit<SavedJob, "savedAt">;
    if (!job?.id || !job.title || !job.company) {
      return NextResponse.json({ success: false, error: "Missing required job fields" }, { status: 400 });
    }

    const supabase = await ensureLegacyJobsImported(userId);
    const { count, error: countError } = await supabase
      .from("saved_jobs")
      .select("external_id", { count: "exact", head: true })
      .eq("clerk_user_id", userId)
      .eq("provider", JOB_PROVIDER);
    if (countError) throw countError;
    if ((count ?? 0) >= SAVED_JOB_LIMIT) {
      return NextResponse.json(
        { success: false, error: `Your tracker holds ${SAVED_JOB_LIMIT} roles. Remove some closed ones to save more.` },
        { status: 409 },
      );
    }
    const { error } = await supabase.from("saved_jobs").upsert(
      normalizeLegacyJob(userId, { ...job, savedAt: Date.now() }),
      { onConflict: "clerk_user_id,provider,external_id", ignoreDuplicates: true },
    );
    if (error) throw error;
    return NextResponse.json({ success: true, data: await getJobs(userId) });
  } catch (error) {
    console.error("Failed to save job to Supabase");
    return NextResponse.json({ success: false, error: "Failed to save job" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id, bucket } = (await request.json()) as { id?: string; bucket?: JobBucket };
    const allowedBuckets: JobBucket[] = ["interested", "applied", "interviewing", "offer", "rejected"];
    if (!id || !bucket || !allowedBuckets.includes(bucket)) {
      return NextResponse.json({ success: false, error: "Invalid job stage update" }, { status: 400 });
    }

    const supabase = await ensureLegacyJobsImported(userId);
    const { error } = await supabase
      .from("saved_jobs")
      .update({ stage: bucket })
      .eq("clerk_user_id", userId)
      .eq("provider", JOB_PROVIDER)
      .eq("external_id", id);
    if (error) throw error;
    return NextResponse.json({ success: true, data: await getJobs(userId) });
  } catch (error) {
    console.error("Failed to update saved job in Supabase");
    return NextResponse.json({ success: false, error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "No id" }, { status: 400 });

    const supabase = await ensureLegacyJobsImported(userId);
    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("clerk_user_id", userId)
      .eq("provider", JOB_PROVIDER)
      .eq("external_id", id);
    if (error) throw error;
    return NextResponse.json({ success: true, data: await getJobs(userId) });
  } catch (error) {
    console.error("Failed to remove saved job from Supabase");
    return NextResponse.json({ success: false, error: "Failed to remove job" }, { status: 500 });
  }
}
