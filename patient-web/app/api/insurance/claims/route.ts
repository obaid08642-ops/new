import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  booking_kind: z.enum(["consultation", "pharmacy", "lab", "radiology", "nursing"]),
  booking_id: z.string().min(1).max(128),
  claim_type: z.string().max(64).optional(),
  amount: z.number().positive().optional(),
  service_date: z.string().max(64).optional(),
  attachment_url: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "invalid_claim_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const key = request.headers.get("idempotency-key")?.trim();
  // R7-4: forward only booking-backed fields. The backend sets status/date
  // itself and ignores client status/submitted_at — never send them.
  const upstream = await callPatientApi(
    "/insurance/claims/submit",
    {
      method: "POST",
      headers: { ...(key ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(parsed.data),
    },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "claim_submit_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
