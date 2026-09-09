import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  medicine_name_ar: z.string().trim().min(1).max(200).optional(),
  medicine_name_en: z.string().trim().max(200).optional(),
  dose: z.string().max(128).optional().default(""),
  times: z.array(z.string().max(8)).max(12).optional().default([]),
  frequency: z.string().max(64).optional().default("daily"),
  duration_days: z.number().min(0).max(3650).optional(),
  chronic: z.boolean().optional().default(false),
  instructions_ar: z.string().max(2000).optional().default(""),
  active: z.boolean().optional(),
}).refine((v) => Boolean(v.medicine_name_ar || v.medicine_name_en), { message: "medicine_name_required" });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "invalid_reminder_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/health/reminders", { method: "POST", body: JSON.stringify(parsed.data) }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "reminder_create_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
