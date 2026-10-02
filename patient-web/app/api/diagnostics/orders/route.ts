import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

// R63: the diagnostics checkout posts here (F74 parent order). The route did not exist, so no lab/radiology
// order could be placed from the website. Shape mirrors the backend CreateDiagnosticOrderDto.
const bodySchema = z.object({
  lines: z.array(z.object({
    kind: z.enum(["lab", "radiology"]),
    service_id: z.string().min(1).max(128),
    provider_account_id: z.string().min(1).max(128).optional(),
  }).strict()).min(1).max(50),
  scheduled_at: z.string().datetime().optional(),
  location_type: z.enum(["home", "facility"]).optional(),
  payment_method: z.enum(["cash", "card", "insurance"]).optional(),
}).strict();

export async function POST(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_diagnostics_order" }, { status: 400 });
  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/unified-bookings/diagnostics/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(input.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "diagnostics_order_failed", upstream.status);
  return NextResponse.json(data ?? {}, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
