import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { bodyLimitViolation } from '@/lib/http/body-limit'

const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/about-us(.*)',
  '/landing-page(.*)',
  '/architecture-plan(.*)',
  '/'
])

export default clerkMiddleware(async (auth, request) => {
  // Before auth, so an oversized body is refused without any work on it.
  const tooBig = bodyLimitViolation(
    request.nextUrl.pathname,
    request.method,
    request.headers.get('content-length'),
    request.headers.get('transfer-encoding'),
  )
  if (tooBig) return NextResponse.json({ success: false, error: tooBig.error }, { status: tooBig.status })

  if (isPublicRoute(request)) return

  const { userId } = await auth()
  if (userId) return

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const signInUrl = new URL('/sign-in', request.url)
  signInUrl.searchParams.set('redirect_url', request.url)
  return NextResponse.redirect(signInUrl)
})
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
