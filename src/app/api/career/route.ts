import { auth } from "@clerk/nextjs/server"
import { createCareerHandler } from "@/lib/career/handler"
import { readCareerWorkspace, writeCareerWorkspace } from "@/lib/career/store"

export const POST = createCareerHandler({
  userId: async () => (await auth()).userId,
  read: readCareerWorkspace,
  write: writeCareerWorkspace,
})
