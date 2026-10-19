import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { extractCoursework, matchCoursework, categorizeUFCourse, UF_CS_PREFIXES } from "@/lib/courseMatching"
import { createClerkSupabaseServerClient } from "@/lib/supabase/server"
import { getCurrentResumeData } from "@/lib/supabase/user-data"

const UF_API_BASE_URL = "https://one.ufl.edu/apix/soc/schedule/"

interface UFApiResponse {
  COURSES: Array<{
    name: string
    code: string
    sections: any[]
  }>
}

/**
 * Fetch UF courses by prefix
 */
async function fetchUFCoursesByPrefix(prefix: string, term: string = "2251") {
  const params = new URLSearchParams({
    category: "CWSP",
    term: term,
    "course-code": prefix,
    "last-row": "0",
  })

  try {
    const response = await fetch(`${UF_API_BASE_URL}?${params.toString()}`)

    if (!response.ok) {
      console.error(`UF API returned status ${response.status} for prefix ${prefix}`)
      return []
    }

    const data: UFApiResponse[] = await response.json()
    const courses: Array<{ name: string; code: string }> = []

    for (const responseItem of data) {
      const responseCourses = responseItem.COURSES || []
      for (const course of responseCourses) {
        courses.push({
          name: course.name || "",
          code: course.code || "",
        })
      }
    }

    return courses
  } catch (error) {
    console.error(`Error fetching UF courses for prefix ${prefix}:`, error)
    return []
  }
}

// GET - Match resume coursework to UF courses
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const term = searchParams.get("term") || "2251"
    const threshold = parseInt(searchParams.get("threshold") || "60")

    // Auth and load the verified resume structure from Supabase.
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const resumeData = await getCurrentResumeData(userId)
    if (!resumeData) {
      return NextResponse.json({
        success: false,
        error: "No resume data found",
        message: "Please upload and verify your resume first"
      }, { status: 404 })
    }

    // Extract coursework from ALL education entries (not just the first)
    const allAchievements: string[] = []
    for (const edu of (resumeData.education || [])) {
      if (edu.achievements && Array.isArray(edu.achievements)) {
        allAchievements.push(...edu.achievements)
      }
    }
    const resumeCourses = extractCoursework(allAchievements)

    if (resumeCourses.length === 0) {
      const supabase = await createClerkSupabaseServerClient()
      const { data: progress, error: progressError } = await supabase.from("course_progress")
        .select("course_code,match_details").eq("clerk_user_id", userId)
      if (progressError) throw progressError
      const stale = (progress ?? []).filter((row) => {
        const details = row.match_details && typeof row.match_details === "object" && !Array.isArray(row.match_details)
          ? row.match_details as Record<string, unknown> : {}
        return details.manual !== true
      }).map((row) => row.course_code)
      if (stale.length) {
        const { error: deleteError } = await supabase.from("course_progress").delete()
          .eq("clerk_user_id", userId).in("course_code", stale)
        if (deleteError) throw deleteError
      }
      return NextResponse.json({
        success: true,
        matches: [],
        resumeCourses: [],
        message: "No relevant coursework found in resume"
      })
    }

    console.log(`Found ${resumeCourses.length} courses in resume:`, resumeCourses)

    // Fetch the public catalog; user data persists separately in Supabase.
    const allUFCourses: Array<{ name: string; code: string }> = []
    for (const prefix of UF_CS_PREFIXES) allUFCourses.push(...await fetchUFCoursesByPrefix(prefix, term))

    // Filter for undergraduate courses (3000-4000 level only, exclude specific courses)
    const excludedCourses = [
      "COP2271", "COP2271L", // Excluded by user request
      /CIS4930/, /EEL4930/    // Generic special topics courses
    ]

    const undergraduateCourses = allUFCourses.filter(course => {
      // Extract the numeric part from course code (e.g., "COP3530" -> 3530)
      const match = course.code.match(/(\d+)/)
      if (!match) return false

      const courseNumber = parseInt(match[1])

      // Only courses 3000-4999 (exclude 2000 and below)
      if (courseNumber < 3000 || courseNumber > 4999) return false

      // Exclude specific courses
      const isExcluded = excludedCourses.some(excluded => {
        if (excluded instanceof RegExp) {
          return excluded.test(course.code)
        }
        return course.code === excluded
      })

      return !isExcluded
    })

    console.log(`Filtered to ${undergraduateCourses.length} undergraduate courses (3000-4000 level, excluding special topics)`)

    // Log all scanned courses
    console.log("\n========== ALL SCANNED UF COURSES (UNDERGRADUATE) ==========")
    undergraduateCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.code} - ${course.name}`)
    })
    console.log("============================================\n")

    // Match resume courses to UF courses
    const matches = matchCoursework(resumeCourses, undergraduateCourses, threshold)

    // Categorize matched courses
    const categorizedMatches = matches.map(match => ({
      ...match,
      category: categorizeUFCourse(match.ufCourse.code, match.ufCourse.name)
    }))

    // Group by category
    const byCategory: Record<string, typeof categorizedMatches> = {}
    for (const match of categorizedMatches) {
      if (!byCategory[match.category]) {
        byCategory[match.category] = []
      }
      byCategory[match.category].push(match)
    }

    // Also categorize ALL UF courses for display (filter out excluded ones)
    const allCategorizedCourses = undergraduateCourses
      .map(course => ({
        ...course,
        category: categorizeUFCourse(course.code, course.name)
      }))
      .filter(course => course.category !== "EXCLUDED") // Remove excluded courses

    // Prepare response data
    const responseData = {
      success: true,
      resumeCourses,
      matches: categorizedMatches,
      byCategory,
      allUFCourses: allCategorizedCourses,
      totalMatches: matches.length,
      ufCoursesScanned: allCategorizedCourses.length,
      lastUpdated: new Date().toISOString()
    }

    const supabase = await createClerkSupabaseServerClient()
    const { data: existingProgress, error: progressError } = await supabase.from("course_progress")
      .select("course_code,is_selected,match_details").eq("clerk_user_id", userId)
    if (progressError) throw progressError
    const selectedCodes = new Set((existingProgress ?? []).filter((row) => row.is_selected).map((row) => row.course_code))
    if (categorizedMatches.length) {
      const existingCodes = new Set((existingProgress ?? []).map((row) => row.course_code))
      const { error: insertError } = await supabase.from("course_progress").upsert(categorizedMatches.map((match) => ({
        clerk_user_id: userId,
        course_code: match.ufCourse.code,
        course_name: match.ufCourse.name,
        category: match.category,
        match_score: match.score,
        match_details: { resumeCourse: match.resumeCourse, ufCourseName: match.ufCourse.name },
        is_selected: selectedCodes.has(match.ufCourse.code) || !existingCodes.has(match.ufCourse.code),
      })), { onConflict: "clerk_user_id,course_code" })
      if (insertError) throw insertError
    }
    const matchedCodes = new Set(categorizedMatches.map((match) => match.ufCourse.code))
    const staleCodes = (existingProgress ?? []).filter((row) => {
      const details = row.match_details && typeof row.match_details === "object" && !Array.isArray(row.match_details)
        ? row.match_details as Record<string, unknown> : {}
      return !matchedCodes.has(row.course_code) && details.manual !== true
    }).map((row) => row.course_code)
    if (staleCodes.length) {
      const { error: staleError } = await supabase.from("course_progress").delete()
        .eq("clerk_user_id", userId).in("course_code", staleCodes)
      if (staleError) throw staleError
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error in course matching API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to match coursework",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
