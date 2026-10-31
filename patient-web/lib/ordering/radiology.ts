/**
 * A radiology basket is booked on the radiology booking route (POST /radiology/bookings: one booking per scan), not on /ordering/bookings,
 * which books labs only. Same quote, same confirm sheet, same result shape: the client splits the submit by kind. The server prices every scan
 * itself; nothing priced is sent. A retry within a few minutes returns the bookings already made (the server's duplicate guard).
 */
import type { OrderingBooking, OrderingBookingResult } from "./bookings";
import { OrderingApiError } from "./client";
import type { Schedule } from "./schedule";
import type { Evidence } from "./schedule";
import type { OrderMode } from "./quote";

export type RadiologyBookingBody = {
  service_id: string; provider_id: string; scheduled_at: string; location_type: "home" | "facility"; payment_method: "card" | "insurance";
  documents?: Array<{ kind: "doctor_request"; url_or_b64: string; filename?: string }>;
};
export type RadiologyRequest = { mode: OrderMode; body: RadiologyBookingBody };

/** One request per scan and place; null while a place has no time, no provider or no scan (nothing is invented). */
export function buildRadiologyRequests(a: {
  schedule: Schedule; home?: string; facility?: string; groups?: Partial<Record<OrderMode, { itemIds: string[] }>>; insured: boolean; evidence?: Evidence; now?: Date;
}): RadiologyRequest[] | null {
  const out: RadiologyRequest[] = [];
  const documents = (a.evidence?.documents ?? []).filter((d): d is NonNullable<RadiologyBookingBody["documents"]>[number] => d.kind === "doctor_request");
  for (const mode of ["home", "facility"] as const) {
    const provider = mode === "home" ? a.home : a.facility;
    if (!provider) continue;
    const time = a.schedule[mode];
    const ids = a.groups?.[mode]?.itemIds ?? [];
    if (!time || ids.length === 0) return null;
    const scheduledAt = time.type === "walk_in" ? (a.now ?? new Date()).toISOString() : time.start;
    for (const id of ids) {
      out.push({ mode, body: { service_id: id, provider_id: provider, scheduled_at: scheduledAt, location_type: mode, payment_method: a.insured ? "insurance" : "card", ...(documents.length ? { documents } : {}) } });
    }
  }
  return out.length > 0 ? out : null;
}

/** Books the requests one after another and answers in the shape of an ordering group, so the confirm sheet needs no second path. */
export async function createRadiologyBookings(requests: RadiologyRequest[], post: (body: RadiologyBookingBody) => Promise<unknown>): Promise<OrderingBookingResult> {
  const bookings: OrderingBooking[] = [];
  for (const r of requests) {
    const made = await post(r.body);
    const o = made && typeof made === "object" ? (made as Record<string, unknown>) : {};
    if (typeof o.id !== "string" || typeof o.total !== "number") throw new OrderingApiError("bad_answer", 502);
    bookings.push({ id: o.id, kind: "radiology", mode: r.mode, status: r.body.payment_method === "insurance" ? "awaiting_approval" : "pending", providerId: r.body.provider_id, total: o.total, items: [{ catalogId: r.body.service_id, price: o.total }] });
  }
  const amount = Math.round(bookings.reduce((s, b) => s + b.total, 0) * 100) / 100;
  return { orderGroupId: `radiology-${bookings[0].id}`, bookings, payment: { amount, status: "pending" } };
}

/** Where one made booking is followed: a lab booking on the ordering status page, a radiology booking on its booking page. */
export const bookingPath = (locale: string, b: { id: string; kind?: "lab" | "radiology" }) =>
  b.kind === "radiology" ? `/${locale}/diagnostics/bookings/radiology/${encodeURIComponent(b.id)}` : `/${locale}/labs/bookings/${encodeURIComponent(b.id)}`;
