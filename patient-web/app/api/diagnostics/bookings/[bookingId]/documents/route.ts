import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ bookingId: string }> };
const schema = z.object({
  kind: z.enum(["doctor_request", "preauth", "insurance_card", "other"]),
  data_url: z.string().max(15_000_000).optional().default(""),
  note: z.string().max(1000).optional().default(""),
});

export async function POST(request: Request, context: Context) {
  const { bookingId } = await context.params;
  if (!bookingId || bookingId.length > 128) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_document_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    `/labs/bookings/${encodeURIComponent(bookingId)}/documents`,
    { method: "POST", body: JSON.stringify({ ...parsed.data, uploaded_at: new Date().toISOString() }) },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "document_upload_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
