import { NextResponse, type NextRequest } from "next/server";
import { callPatientApi } from "@/lib/api/upstream";
import { forwardApiResponse } from "@/lib/api/response";
import { isLocale } from "@/lib/i18n";

/**
 * Issue 1544: the instant suggestions of the search boxes (GET /search/suggest is @Public on the backend). Only the
 * typed text (the backend's 60-character limit) and the page's language are forwarded, never the session: the answer
 * is the same for everyone. When the browser cancels the request (a newer letter was typed), the upstream call is
 * cancelled with it.
 */
export async function GET(request: NextRequest) {
  const q = Array.from((request.nextUrl.searchParams.get("q") ?? "").trim()).slice(0, 60).join("");
  const locale = request.nextUrl.searchParams.get("locale") ?? "ar";
  if (!q) return NextResponse.json({ message: "query_required" }, { status: 400 });
  if (!isLocale(locale)) return NextResponse.json({ message: "invalid_locale" }, { status: 400 });
  const upstream = await callPatientApi(`/search/suggest?q=${encodeURIComponent(q)}&locale=${locale}`, { signal: request.signal });
  return forwardApiResponse(upstream);
}
