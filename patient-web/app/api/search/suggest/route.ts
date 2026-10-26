import { NextResponse, type NextRequest } from "next/server";
import { callPatientApi } from "@/lib/api/upstream";
import { forwardApiResponse } from "@/lib/api/response";
import { isLocale } from "@/lib/i18n";

const SECTIONS = ["pharmacy", "consultations", "labs", "nursing"];
const TYPES = ["medicine", "doctor", "specialty", "lab_test", "lab_package", "radiology", "nursing", "article"];

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
  // A service screen's own suggestions: the section and the types are checked here (the backend checks them again); nothing else is forwarded.
  const section = request.nextUrl.searchParams.get("section");
  const types = request.nextUrl.searchParams.get("types");
  if (section !== null && !SECTIONS.includes(section)) return NextResponse.json({ message: "invalid_section" }, { status: 400 });
  if (types !== null && !(types.split(",").length > 0 && types.split(",").every((t) => TYPES.includes(t)))) return NextResponse.json({ message: "invalid_types" }, { status: 400 });
  const scope = `${section ? `&section=${section}` : ""}${types ? `&types=${encodeURIComponent(types)}` : ""}`;
  const upstream = await callPatientApi(`/search/suggest?q=${encodeURIComponent(q)}&locale=${locale}${scope}`, { signal: request.signal });
  const response = await forwardApiResponse(upstream);
  // Only a shared answer may be cached at the edge: the API says `public` for an anonymous request (this route sends none),
  // and only for a 200. Every other answer keeps forwardApiResponse's `no-store`. The cache key is the query string (q, locale).
  const cacheControl = upstream.headers.get("cache-control");
  if (upstream.status === 200 && cacheControl && cacheControl.startsWith("public")) response.headers.set("cache-control", cacheControl);
  return response;
}
