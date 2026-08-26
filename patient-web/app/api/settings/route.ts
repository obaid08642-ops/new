import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const profileSchema = z.object({
  kind: z.literal("profile"),
  display_name: z.string().trim().min(1).max(160).optional(),
  locale: z.enum(["ar", "en", "ur", "hi", "bn", "fil"]).optional(),
  gender: z.enum(["male", "female"]).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  height_cm: z.coerce.number().min(50).max(260).optional(),
  weight_kg: z.coerce.number().min(15).max(500).optional(),
});
const notificationsSchema = z.object({
  kind: z.literal("notifications"),
  channels: z.object({
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    email: z.boolean().optional(),
  }).optional(),
  categories: z.record(z.string().trim().min(2).max(40), z.boolean()).optional(),
}).refine((data) => Boolean(data.channels || data.categories), { message: "empty_settings_patch" });
const bodySchema = z.discriminatedUnion("kind", [profileSchema, notificationsSchema]);

/** Settings parity #28: allowlisted profile patch + notification preferences. */
export async function PATCH(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_settings_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const path = parsed.data.kind === "profile" ? "/users/me" : "/users/me/notification-settings";
  const payload: Record<string, unknown> = { ...parsed.data };
  delete payload.kind;
  const upstream = await callPatientApi(path, {
    method: "PATCH",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(payload),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "update_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
