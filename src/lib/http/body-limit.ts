/**
 * The largest JSON body an API route accepts. A full resume with feedback is
 * tens of kilobytes; 1 MB leaves room without letting one request make the
 * server parse and validate an arbitrarily large payload.
 */
export const MAX_JSON_BODY_BYTES = 1024 * 1024

/** Routes that take a file rather than JSON, with their own size checks. */
const FILE_ROUTES = ["/api/upload"]

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"])

/**
 * Why a request to an API route should be refused before it reaches the
 * handler, judged from its headers alone, or null to let it through.
 *
 * A body without a Content-Length (a chunked stream) is refused too: browsers
 * always send one for the string and FormData bodies this app uses, so only a
 * client trying to slip past the limit would leave it out.
 */
export function bodyLimitViolation(
  pathname: string,
  method: string,
  contentLength: string | null,
  transferEncoding: string | null,
): { status: 411 | 413; error: string } | null {
  if (!pathname.startsWith("/api/")) return null
  if (!METHODS_WITH_BODY.has(method.toUpperCase())) return null
  if (FILE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return null

  if (contentLength === null) {
    return transferEncoding ? { status: 411, error: "Request body must have a Content-Length." } : null
  }
  const bytes = Number(contentLength)
  if (!Number.isFinite(bytes) || bytes < 0) return { status: 411, error: "Request body must have a Content-Length." }
  if (bytes > MAX_JSON_BODY_BYTES) return { status: 413, error: "Request is too large." }
  return null
}
