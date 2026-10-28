import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { deleteAccountData, type AccountDataTable } from "@/lib/account-deletion"
import { deleteObjectsInS3, listObjectsInS3 } from "@/lib/aws/s3"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"

export async function DELETE(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (body?.confirmation !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 })
  }

  try {
    const supabase = await createClerkSupabaseServerClient()
    const client = await clerkClient()

    await deleteAccountData(userId, {
      listObjects: async (prefix) => (await listObjectsInS3(prefix)).map((object) => object.key),
      deleteObjects: deleteObjectsInS3,
      deleteRows: async (table: AccountDataTable, owner) => {
        const { error } = await supabase.from(table as "application_events").delete().eq("clerk_user_id", owner)
        if (error) throw error
      },
      countRows: async (table: AccountDataTable, owner) => {
        const { count, error } = await supabase
          .from(table as "application_events")
          .select("clerk_user_id", { count: "exact", head: true })
          .eq("clerk_user_id", owner)
        if (error) throw error
        if (count === null) throw new Error(`Could not verify deletion from ${table}`)
        return count
      },
      deleteIdentity: async (owner) => { await client.users.deleteUser(owner) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Account deletion failed:", error)
    return NextResponse.json(
      { error: "Could not finish deleting your account. Please try again or contact support." },
      { status: 500 },
    )
  }
}
