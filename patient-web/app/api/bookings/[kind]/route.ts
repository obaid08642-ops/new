import { z } from "zod";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { callPatientApi } from "@/lib/api/upstream";

const UPSTREAM = process.env.NABD_API_BASE_URL || "https://api.nabd.plus/api/v1";
const KINDS: Record<string, string> = { lab: "/labs/bookings", radiology: "/radiology/bookings", nursing: "/home-care/bookings" };
const PAYKIND: Record<string, string> = { lab: "lab", radiology: "radiology", nursing: "nursing" };

const schema = z.object({
  service_id: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  home_collection: z.boolean().optional(),
  coverage: z.enum(["CASH", "INSURANCE"]),
  // Family on-behalf booking: validated upstream against family groups.
  member_id: z.string().trim().regex(/^[0-9a-f-]{8,64}$/i).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ kind: string }> }) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  // Unified BFF standard: idempotency via header (fetch callers) or hidden
  // form field (no-JS form posts) — required, min length like other routes.
  const formData = await request.formData().then((fd) => Object.fromEntries(fd.entries())).catch(() => null);
  const idempotencyKey = String(
    request.headers.get("idempotency-key")?.trim() || formData?.["idempotency-key"] || "",
  );
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  }
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "unauthenticated" }, { status: 401 });

  const { kind } = await context.params;
  const path = KINDS[kind];
  const payKind = PAYKIND[kind];
  if (!path || !payKind) return NextResponse.json({ message: "invalid_kind" }, { status: 400 });

  const parsed = schema.safeParse((() => {
    const entries = { ...(formData ?? {}) } as Record<string, unknown>;
    // An untouched "for myself" select submits "" — treat it as absent.
    if (entries.member_id === "") delete entries.member_id;
    return entries;
  })());
  if (!parsed.success) return NextResponse.json({ message: "invalid_payload" }, { status: 400 });
  const b = parsed.data;

  // 1) create the booking (no payment for either branch at this point)
  const created = await callPatientApi(path, {
    method: "POST",
    // service_id top-level is what /home-care/bookings requires; labs/radiology
    // consume the items[] shape and ignore the extra field.
    body: JSON.stringify({
      service_id: b.service_id,
      items: [{ service_id: b.service_id, qty: 1 }],
      scheduled_at: `${b.date}T${b.time}:00`,
      home_collection: !!b.home_collection,
      payment_method: b.coverage === "INSURANCE" ? "insurance" : "card",
      ...(b.member_id ? { member_id: b.member_id } : {}),
    }),
  }, token);
  if (!created.ok) {
    const err: any = await created.json().catch(() => ({}));
    return NextResponse.json({ message: err?.message || "booking_failed" }, { status: created.status });
  }
  const booking: any = await created.json();

  // 2a) CASH → server-priced intent immediately (payment confirms the booking)
  if (b.coverage === "CASH") {
    const intent = await callPatientApi(`/payments/intent/${payKind}/${encodeURIComponent(booking.id)}`, {
      method: "POST",
      headers: { "Idempotency-Key": `web-${booking.id}` },
    }, token);
    const data: any = await intent.json().catch(() => ({}));
    if (!intent.ok || !data?.checkout_url) {
      return NextResponse.redirect(new URL(`/${"ar"}/orders?pending=${booking.id}`, request.url), 303);
    }
    return NextResponse.redirect(new URL(data.checkout_url), 303);
  }

  // 2b) INSURANCE → submit the coverage request only (PH-SERVICE: no payment now)
  const insReq = await callPatientApi("/insurance/requests", {
    method: "POST",
    body: JSON.stringify({ booking_id: booking.id, booking_kind: kind }),
  }, token);
  return NextResponse.json({ ok: true, booking_id: booking.id, insurance_request_id: insReq.ok ? (await insReq.json().catch(() => ({})))?.id ?? null : null, state: "REQUEST_SUBMITTED" }, { status: 200 });
}
