import { NextResponse } from "next/server";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * R11 §5: refuse a state-changing request that a browser sent from another
 * site. Browsers send Sec-Fetch-Site (and Origin) on every such request, so
 * only "same-origin" (or "none", typed by the user) passes; a sibling
 * subdomain counts as another site. Callers without either header are not
 * browsers (server-to-server, agents) and carry no ambient cookies to abuse.
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) return null;
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ message: "cross_origin_request_forbidden" }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    if (!host || new URL(origin).host !== host) {
      return NextResponse.json({ message: "cross_origin_request_forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ message: "invalid_origin" }, { status: 400 });
  }
  return null;
}
