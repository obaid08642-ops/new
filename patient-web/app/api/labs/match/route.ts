import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const bodySchema = z.object({ service_id: z.string().trim().min(1).max(160) });
function publicProvider(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const provider = value as Record<string, unknown>;
  const accountId = typeof provider.account_id === "string" ? provider.account_id : undefined;
  if (!accountId) return null;
  const name = typeof provider.display_name === "string" ? provider.display_name : typeof provider.name === "string" ? provider.name : accountId;
  return { account_id: accountId, name, city: typeof provider.city === "string" ? provider.city : undefined, rating: typeof provider.rating_avg === "number" ? provider.rating_avg : undefined };
}

export async function POST(request: Request) {
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_lab_match_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const upstream = await callPatientApi("/workflow/match", { method: "POST", headers: { "content-type": "application/json", ...(deviceId ? { "x-device-id": deviceId } : {}) }, body: JSON.stringify({ kind: "lab", service_ids: [input.data.service_id], max_results: 12 }) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "lab_provider_match_failed", upstream.status);
  const providers = Array.isArray(data) ? data.flatMap((value) => { const mapped = publicProvider(value); return mapped ? [mapped] : []; }) : [];
  return NextResponse.json({ providers }, { headers: { "cache-control": "no-store" } });
}
