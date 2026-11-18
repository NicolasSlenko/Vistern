import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { sharingSchema } from "@/lib/community/public-card"
import { loadCardSource, readMySharing, saveMySharing } from "@/lib/community/people-store"

/**
 * The signed-in student's People card: what they share, and everything they
 * could. `source` goes to its owner only, so the switches can preview without
 * a request each; other students only ever read the stored card.
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const [{ sharing, card }, source] = await Promise.all([readMySharing(userId), loadCardSource(userId)])
    return NextResponse.json({ success: true, data: { sharing, card, source } })
  } catch (error) {
    console.error("Error reading People card:", error)
    return NextResponse.json({ success: false, error: "Couldn't load your card" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const parsed = sharingSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ success: false, error: "Those sharing choices aren't valid" }, { status: 400 })

    const saved = await saveMySharing(userId, parsed.data)
    if (parsed.data.listed && !saved.sharing.listed) {
      return NextResponse.json(
        { success: false, error: "Add your name to your profile before listing your card", data: saved },
        { status: 422 },
      )
    }
    return NextResponse.json({ success: true, data: saved })
  } catch (error) {
    console.error("Error saving People card:", error)
    return NextResponse.json({ success: false, error: "Couldn't save your card" }, { status: 500 })
  }
}
