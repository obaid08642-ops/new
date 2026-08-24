import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

function publicProvider(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const provider = value as Record<string, unknown>;
  const id = typeof provider.id === "string" ? provider.id : undefined;
  if (!id) return null;
  return { id, name: typeof provider.full_name === "string" ? provider.full_name : id, specialties: Array.isArray(provider.specialties) ? provider.specialties.filter((item): item is string => typeof item === "string").slice(0, 10) : [], rating: typeof provider.rating_avg === "number" ? provider.rating_avg : undefined, experience_years: typeof provider.years_experience === "number" ? provider.years_experience : undefined };
}

export async function GET() {
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const upstream = await callPatientApi("/home-care/providers", { headers: deviceId ? { "x-device-id": deviceId } : {} }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "home_care_providers_failed", upstream.status);
  const providers = Array.isArray(data) ? data.flatMap((value) => { const mapped = publicProvider(value); return mapped ? [mapped] : []; }) : [];
  return NextResponse.json({ providers }, { headers: { "cache-control": "no-store" } });
}
