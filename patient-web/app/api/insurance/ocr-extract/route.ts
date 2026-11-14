import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

/** A photo of the insurance card, as the app sends it (POST /insurance/ocr-extract { image_base64, mime_type }). */
const schema = z.object({
  image_base64: z.string().min(100).max(8_000_000).regex(/^[A-Za-z0-9+/=]+$/),
  mime_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

/** Only the fields the add-policy form fills are passed on, as text; whatever else the reader returned is dropped. */
const FIELDS = ["policy_number", "national_id", "member_name", "expiry_date", "provider"] as const;

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_card_image" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/insurance/ocr-extract", { method: "POST", body: JSON.stringify(parsed.data) }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "card_scan_failed", upstream.status);
  const extracted = data && typeof data === "object" && !Array.isArray(data) ? (data as { extracted_data?: unknown }).extracted_data : null;
  const source = extracted && typeof extracted === "object" && !Array.isArray(extracted) ? (extracted as Record<string, unknown>) : null;
  const fields: Record<string, string> = {};
  for (const key of FIELDS) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) fields[key] = value.trim().slice(0, 160);
  }
  return NextResponse.json({ success: Object.keys(fields).length > 0, extracted_data: fields }, { headers: { "cache-control": "no-store" } });
}
