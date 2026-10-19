import { auth } from "@clerk/nextjs/server"
import { getJsonFromS3, putJsonToS3 } from "@/lib/aws/s3"
import { createStudentProfileHandler } from "@/lib/student-profile-handler"
import type { StudentProfile } from "@/lib/student-profile"

export const POST = createStudentProfileHandler({
  userId: async () => (await auth()).userId,
  read: (key) => getJsonFromS3<StudentProfile>(key),
  write: putJsonToS3,
})
