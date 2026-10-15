import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { forwardApiResponse } from "@/lib/api/response";

/**
 * Issue 439: the search the public Home box and its JSON-LD SearchAction open (GET /search is @Public on the backend).
 * A signed-out visitor searches too; a signed-in patient's session is passed on so the answer is the same as before.
 * Only the query, the page's language and a small page size are forwarded.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 200);
  const locale = (request.nextUrl.searchParams.get("locale") ?? "ar").slice(0, 3);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 10, 1), 20);
  if (!q) return NextResponse.json({ message: "query_required" }, { status: 400 });
  if (!/^[a-z]{2,3}$/i.test(locale)) return NextResponse.json({ message: "invalid_locale" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  const upstream = await callPatientApi(`/search?q=${encodeURIComponent(q)}&locale=${locale}&limit=${limit}`, { cache: "no-store" }, token ?? null);
  return forwardApiResponse(upstream);
}
