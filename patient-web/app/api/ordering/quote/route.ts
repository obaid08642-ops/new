import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const id = z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/);
const schema = z.object({
  service_kind: z.enum(["lab", "radiology", "nursing"]),
  items: z.array(id).min(1).max(30),
  context: z.object({
    mode: z.enum(["home", "facility"]), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), payer: z.enum(["cash", "insurance"]),
    family_member_id: id.optional(), staff_gender: z.enum(["female", "male"]).optional(),
  }),
  sort: z.enum(["cheapest", "nearest", "fastest", "rating"]).optional(),
});

/** POST /ordering/quote for the signed-in patient (the basket, the item page and the provider list all ask here). */
export async function POST(request: Request) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_quote_payload" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/ordering/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "quote_failed", upstream.status);
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
