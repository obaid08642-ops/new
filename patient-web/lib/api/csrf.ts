import { NextResponse } from "next/server";

/**
 * F-W2/CSRF: all state-changing BFF routes must present a same-origin context.
 * Cookie auth alone (SameSite=Lax) does not stop top-level cross-site POSTs.
 * Defense layers here:
 *  1. Origin/Referer host must equal the request host (or an allowlisted origin).
 *  2. Sec-Fetch-Site must not be "cross-site" when the browser sends it.
 */
const EXTRA_ALLOWED_ORIGINS = (process.env.ALLOWED_WEB_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function assertSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "csrf_cross_site_blocked" }, { status: 403 });
  }

  if (!origin && !referer) {
    // Non-browser clients (curl) hit this too; for cookie-auth mutations we fail closed.
    return NextResponse.json({ error: "csrf_origin_missing" }, { status: 403 });
  }

  let originHost = "";
  try {
    originHost = new URL(origin || referer || "").host;
  } catch {
    return NextResponse.json({ error: "csrf_invalid_origin" }, { status: 403 });
  }

  const requestHost = request.headers.get("host") || new URL(request.url).host;
  const allowed = new Set([requestHost, ...EXTRA_ALLOWED_ORIGINS.map((o) => o.replace(/^https?:\/\//, ""))]);
  if (!allowed.has(originHost)) {
    return NextResponse.json({ error: "csrf_origin_mismatch" }, { status: 403 });
  }
  return null; // same-origin — allow
}
