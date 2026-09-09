import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  type: z.enum(["bp", "glucose", "heart_rate", "weight", "temperature", "spo2"]),
  value: z.number().min(0).max(100000).optional(),
  systolic: z.number().min(0).max(500).optional(),
  diastolic: z.number().min(0).max(500).optional(),
  unit: z.string().max(16).optional(),
  context: z.string().max(64).optional(),
  measured_at: z.string().max(64).optional(),
}).refine(
  (v) => (v.type === "bp" ? v.systolic !== undefined && v.diastolic !== undefined : v.value !== undefined),
  { message: "invalid_vital_payload" },
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "invalid_vital_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/health/vitals", { method: "POST", body: JSON.stringify(parsed.data) }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "vital_log_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
