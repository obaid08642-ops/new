import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { insurerOf } from "@/lib/consult/doctor-filters";

const schema = z.object({
  company_id: z.string().min(1).max(128),
  policy_number: z.string().min(3).max(64),
  member_id: z.string().max(64).optional().default(""),
  member_name: z.string().max(128).optional().default(""),
  expiry_date: z.string().max(32).optional().default(""),
  // the card's copay figures (optional; the backend DTO bounds are the same)
  copay_percent: z.number().min(0).max(100).optional(),
  copay_cap_sar: z.number().min(0).max(1_000_000).optional(),
  // the insurer's network (the app's network chips); the policy stores it with the company and class
  network: z.string().max(128).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "invalid_policy_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const key = request.headers.get("idempotency-key")?.trim();
  const upstream = await callPatientApi(
    "/insurance/save-policy",
    {
      method: "POST",
      headers: { ...(key ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(parsed.data),
    },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "policy_save_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}

/** The saved policy's company and class only (decision 30: the doctors list asks for it in the browser; the page reads no session). */
export async function GET() {
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  const noStore = { "cache-control": "no-store" };
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401, headers: noStore });
  const upstream = await callPatientApi("/users/me/insurance", { cache: "no-store" }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "policy_read_failed", upstream.status);
  const insurer = insurerOf(data);
  return insurer ? NextResponse.json(insurer, { headers: noStore }) : NextResponse.json({ message: "no_policy" }, { status: 404, headers: noStore });
}

/** Removes the saved policy (QA I-03: a card could only be overwritten). Signed in only; the backend clears the caller's own policy. */
export async function DELETE() {
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  const noStore = { "cache-control": "no-store" };
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401, headers: noStore });
  const upstream = await callPatientApi("/users/me/insurance", { method: "DELETE", cache: "no-store" }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "policy_delete_failed", upstream.status);
  return NextResponse.json({ success: true, removed: Boolean((data as { removed?: unknown } | null)?.removed) }, { headers: noStore });
}
