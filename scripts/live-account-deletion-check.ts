import "dotenv/config"
import assert from "node:assert/strict"
import { createClerkClient } from "@clerk/backend"
import { createClient } from "@supabase/supabase-js"
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3"
import { ACCOUNT_DATA_TABLES, deleteAccountData } from "../src/lib/account-deletion"

async function main() {
  if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_")) throw new Error("This check requires a Clerk test instance")
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  const s3 = new S3Client({
    region: process.env.AWS_BUCKET_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.IAM_AWS_ACCESS_KEY || "",
      secretAccessKey: process.env.IAM_AWS_SECRET_ACCESS_KEY || "",
    },
  })
  const bucket = process.env.AWS_BUCKET_NAME!
  const email = `vistern-delete-check-${Date.now()}@example.com`
  const existingId = process.argv[2]
  const user = existingId ? await clerk.users.getUser(existingId) : await clerk.users.createUser({ emailAddress: [email], firstName: "Disposable", lastName: "Deletion Check", skipPasswordRequirement: true })
  if (user.firstName !== "Disposable" || user.lastName !== "Deletion Check" || !user.emailAddresses.some((entry) => entry.emailAddress.startsWith("vistern-delete-check-"))) throw new Error("Refusing to operate on a non-test user")
  const userId = user.id
  console.log(existingId ? "Resuming disposable Clerk user:" : "Created disposable Clerk user:", userId)
  let finished = false
  try {
    const session = await clerk.sessions.createSession({ userId })
    const token = await clerk.sessions.getToken(session.id)
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { accessToken: async () => token.jwt })
    const insert = async (table: string, value: Record<string, unknown>) => {
      const { data, error } = await db.from(table).insert(value).select("*").single()
      if (error) throw new Error(`Could not seed ${table}: ${error.code} ${error.message}`)
      return data
    }
    if (!existingId) {
      const profile = await insert("student_profiles", { clerk_user_id: userId, basics: { name: "Disposable Test" } })
      const item = await insert("profile_items", { clerk_user_id: userId, profile_id: profile.id, identity_key: "delete-check", item_type: "project", title: "Disposable Project", content: {} })
      const document = await insert("resume_documents", { clerk_user_id: userId, profile_id: profile.id, source_type: "generated", status: "ready", structured_content: {} })
      await insert("resume_document_items", { clerk_user_id: userId, profile_id: profile.id, profile_item_id: item.id, resume_document_id: document.id, position: 0 })
      await insert("saved_jobs", { clerk_user_id: userId, external_id: "delete-check", provider: "mock", company: "Example", title: "Mock job" })
      const key = `uploads/${userId}/mock-resume.txt`
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "disposable test data", ContentType: "text/plain" }))
    }
    const listObjects = async (prefix: string) => {
      const keys: string[] = []
      let token: string | undefined
      do {
        const response = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }))
        keys.push(...(response.Contents || []).flatMap((item) => item.Key ? [item.Key] : []))
        token = response.IsTruncated ? response.NextContinuationToken : undefined
        if (response.IsTruncated && !token) throw new Error("Incomplete S3 list")
      } while (token)
      return keys
    }
    if (!existingId) {
      assert((await listObjects(`uploads/${userId}/`)).includes(`uploads/${userId}/mock-resume.txt`))
      console.log("Seeded Clerk, Supabase profile/resume/job rows, and S3 object")
    }
    await deleteAccountData(userId, {
      listObjects,
      deleteObjects: async (keys) => {
        for (let i = 0; i < keys.length; i += 1000) {
          const response = await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }))
          if (response.Errors?.length) throw new Error("S3 deletion failed")
        }
      },
      deleteRows: async (table, owner) => {
        const { error } = await db.from(table).delete().eq("clerk_user_id", owner)
        if (error) throw new Error(`${table}: ${error.code} ${error.message}`)
      },
      countRows: async (table, owner) => {
        const { count, error } = await db.from(table).select("clerk_user_id", { count: "exact", head: true }).eq("clerk_user_id", owner)
        if (error || count === null) throw new Error(`${table}: ${error?.code || "unknown"} ${error?.message || "No count"}`)
        return count
      },
      deleteIdentity: async (owner) => { await clerk.users.deleteUser(owner) },
    })
    assert.equal((await listObjects(`uploads/${userId}/`)).length, 0)
    for (const table of ACCOUNT_DATA_TABLES) {
      const { count, error } = await db.from(table).select("clerk_user_id", { count: "exact", head: true }).eq("clerk_user_id", userId)
      if (error) throw new Error(`Post-deletion verification failed for ${table}: ${error.message}`)
      assert.equal(count, 0, table)
    }
    let identityMissing = false
    try {
      await clerk.users.getUser(userId)
    } catch (error: any) {
      if (error.status !== 404) throw error
      identityMissing = true
    }
    assert(identityMissing, "Clerk identity remains")
    finished = true
    console.log("PASS: Clerk identity, every Supabase table, and S3 prefix cleared")
  } finally {
    if (!finished) console.error("Cleanup did not complete for disposable user:", userId)
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
