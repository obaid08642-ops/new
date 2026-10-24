import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { doctorDisplayName, extractDoctors } from "@/lib/api/doctors";
import { isLocale } from "@/lib/i18n";

/** Find a doctor to share a report with (GET /care/doctors?q=, the same search the app uses). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const locale = url.searchParams.get("locale") ?? "ar";
  if (q.length < 2) return NextResponse.json({ doctors: [] }, { headers: { "cache-control": "no-store" } });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/care/doctors?q=${encodeURIComponent(q)}&limit=10`, {}, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "doctor_search_failed", upstream.status);
  const lang = isLocale(locale) ? locale : "ar";
  const doctors = extractDoctors(data).map((d) => ({ id: d.id, name: doctorDisplayName(d, lang) ?? "" })).filter((d) => d.id);
  return NextResponse.json({ doctors }, { headers: { "cache-control": "no-store" } });
}
