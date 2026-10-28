import { auth } from "@clerk/nextjs/server"
import { createStudentProfileHandler } from "@/lib/student-profile-handler"
import { readStudentProfile, writeStudentProfile } from "@/lib/student-profile-store"

// The handler creates this key from the authenticated Clerk ID. The parser only
// preserves its existing dependency contract; no object is written to S3.
function userIdFromKey(key: string) {
  const match = /^uploads\/([^/]+)\/student-profile\.json$/.exec(key)
  if (!match) throw new Error("Invalid student profile key")
  return match[1]
}

export const POST = createStudentProfileHandler({
  userId: async () => (await auth()).userId,
  read: (key) => readStudentProfile(userIdFromKey(key)),
  write: (key, value) => writeStudentProfile(userIdFromKey(key), value),
})
