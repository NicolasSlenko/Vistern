import { ZodError } from "zod"
import {
  studentProfileUpdateSchema,
  updateStudentProfile,
  type StudentProfile,
  type StudentProfileUpdate,
} from "./student-profile"

// Keep account identity server-owned; callers cannot choose a storage key.
export function createStudentProfileHandler(deps: {
  userId: () => Promise<string | null>
  read: (key: string) => Promise<StudentProfile | null>
  write: (key: string, value: StudentProfile) => Promise<void>
}) {
  return async function POST(request: Request) {
    try {
      const userId = await deps.userId()
      if (!userId)
        return Response.json({ success: false, error: "Please sign in again." }, { status: 401 })
      let payload: StudentProfileUpdate
      try {
        payload = studentProfileUpdateSchema.parse(await request.json())
      } catch (error) {
        if (!(error instanceof ZodError || error instanceof SyntaxError)) throw error
        return Response.json(
          { success: false, error: "Check your answers and try again." },
          { status: 400 },
        )
      }
      const key = `uploads/${userId}/student-profile.json`
      const current = await deps.read(key)
      const data = updateStudentProfile(current, payload)
      await deps.write(key, data)
      return Response.json({ success: true, data })
    } catch {
      return Response.json(
        {
          success: false,
          error: "We couldn’t save your changes. Your answers are still here; please try again.",
        },
        { status: 500 },
      )
    }
  }
}
