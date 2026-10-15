import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { hasLocation, parseDeliveryAddresses } from "@/lib/pharmacy/delivery-address";

/**
 * journeys#60 (issue 1069): a home nursing visit booked on the website, as the app books it (POST /nursing/bookings):
 * the chosen nurse (provider account id), the service, a free slot, the patient's own saved address with its location
 * (read here from the patient's addresses, never taken from the browser) and card or insurance.
 */
const schema = z.object({
  provider_id: z.string().min(1).max(128),
  service_id: z.string().min(1).max(128),
  scheduled_at: z.string().min(1).max(64),
  address_id: z.string().min(1).max(128),
  notes: z.string().max(2000).optional(),
  payment_method: z.enum(["card", "insurance"]),
}).strict();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });
  const scheduled = new Date(parsed.data.scheduled_at);
  if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now()) return NextResponse.json({ message: "slot_expired" }, { status: 400 });
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const addressResponse = await getPatientAddresses(accessToken);
  if (!addressResponse.ok) return boundedUpstreamError(await addressResponse.json().catch(() => null), "addresses_unavailable", addressResponse.status);
  const address = parseDeliveryAddresses(await addressResponse.json().catch(() => null)).find((a) => a.id === parsed.data.address_id);
  if (!address || !hasLocation(address)) return NextResponse.json({ message: "address_location_required" }, { status: 400 });

  const upstream = await callPatientApi("/nursing/bookings", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify({
      provider_id: parsed.data.provider_id,
      service_id: parsed.data.service_id,
      scheduled_at: scheduled.toISOString(),
      address: { address: [address.street, address.district, address.city].filter(Boolean).join("، ") || undefined, city: address.city ?? undefined, district: address.district ?? undefined, lat: address.lat, lng: address.lng },
      ...(parsed.data.notes?.trim() ? { notes: parsed.data.notes.trim() } : {}),
      payment_method: parsed.data.payment_method,
    }),
  }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "nursing_booking_failed", upstream.status);
  const booking = ((data as { data?: unknown } | null)?.data ?? data) as { id?: unknown; booking_id?: unknown } | null;
  const id = typeof booking?.id === "string" ? booking.id : typeof booking?.booking_id === "string" ? booking.booking_id : null;
  if (!id) return NextResponse.json({ message: "unexpected_booking_response" }, { status: 502 });
  return NextResponse.json({ id }, { status: 201, headers: { "cache-control": "no-store" } });
}
