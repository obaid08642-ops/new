import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const triageSchema = z.object({
  symptoms: z.string().trim().min(2).max(1000),
  body_region: z.string().trim().max(80).optional(),
  red_flags: z.array(z.enum([
    "chest_pain", "breathing_difficulty", "fainting_or_unresponsive", "heavy_bleeding",
    "new_confusion", "severe_allergic_reaction", "severe_injury", "none",
  ])).max(8).optional(),
});
const translateSchema = z.object({
  kind: z.literal("ocr-translate"),
  image_base64: z.string().min(50).max(7_000_000), // ~5MB binary as base64
  target_lang: z.enum(["ar", "en"]).optional(),
});
const skinSchema = z.object({
  kind: z.literal("skin-analysis"),
  acknowledge_limitations: z.literal(true),
  areas: z.array(z.enum(["face", "hand", "back", "body", "other"])).min(1).max(5),
  observations: z.array(z.enum([
    "new_or_changing", "growing_or_changed_colour_texture", "painful_or_itchy",
    "bleeding_or_crusting", "not_healing_over_four_weeks", "none",
  ])).min(1).max(6),
  note: z.string().trim().max(500).optional(),
});
const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("triage"), triage: triageSchema }),
  translateSchema,
  skinSchema,
]);

/** AI parity #20: triage / prescription photo translation / skin self-check. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_ai_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  let path: string;
  let payload: unknown;
  if (parsed.data.kind === "triage") {
    path = "/ai/triage";
    payload = parsed.data.triage;
  } else if (parsed.data.kind === "ocr-translate") {
    path = "/ai/ocr-translate";
    payload = { image_base64: parsed.data.image_base64, target_lang: parsed.data.target_lang ?? "ar" };
  } else {
    path = "/ai/skin-analysis";
    const { kind, ...rest } = parsed.data;
    payload = rest;
  }
  const upstream = await callPatientApi(path, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(payload),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "ai_request_failed" }, { status: upstream.status });
  return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
}
