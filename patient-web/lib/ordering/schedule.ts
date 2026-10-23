/**
 * Ord06/Ord07 (time picker, confirm and pay): the pure part. The time choice per mode, the ASAP broadcast answer, the day grouping of the
 * offered windows and the booking request built from the choices. Every number shown comes from an endpoint; the only arithmetic here is
 * day grouping and a countdown of the server's `seconds_left`.
 */
import type { BookingRequest } from "./client";
import type { OrderMode, StaffGender } from "./quote";
import type { WindowsAnswer } from "./windows";

export const SCHEDULE_KEY = "nabd_ordering_schedule_v1";

export type HomeTime = { type: "window"; start: string; end: string };
export type FacilityTime = { type: "slot"; id: string; start: string; end: string } | { type: "walk_in" };
export type Schedule = { quoteId: string; home?: HomeTime; facility?: FacilityTime; asapId?: string };

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const text = (v: unknown) => (typeof v === "string" && v ? v : null);

export function parseSchedule(raw: string | null): Schedule | null {
  try {
    const x = obj(JSON.parse(raw ?? "null"));
    const quoteId = x && text(x.quoteId);
    if (!x || !quoteId) return null;
    const h = obj(x.home);
    const f = obj(x.facility);
    const home: HomeTime | undefined = h && h.type === "window" && text(h.start) && text(h.end) ? { type: "window", start: h.start as string, end: h.end as string } : undefined;
    let facility: FacilityTime | undefined;
    if (f && f.type === "walk_in") facility = { type: "walk_in" };
    else if (f && f.type === "slot" && text(f.id) && text(f.start) && text(f.end)) facility = { type: "slot", id: f.id as string, start: f.start as string, end: f.end as string };
    return { quoteId, ...(home ? { home } : {}), ...(facility ? { facility } : {}), ...(text(x.asapId) ? { asapId: x.asapId as string } : {}) };
  } catch {
    return null;
  }
}

/** The local calendar day (YYYY-MM-DD) of an instant. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The offered windows grouped by local day, in the order the server sent them. */
export function groupByDay(windows: Array<{ start: string; end: string }>): Array<{ day: string; windows: Array<{ start: string; end: string }> }> {
  const out: Array<{ day: string; windows: Array<{ start: string; end: string }> }> = [];
  for (const w of windows) {
    const day = dayKey(w.start);
    const last = out[out.length - 1];
    if (last && last.day === day) last.windows.push(w);
    else out.push({ day, windows: [w] });
  }
  return out;
}

/** The next `n` local days (today first) as YYYY-MM-DD, for the centre slot day picker (GET /ordering/windows?date=). */
export function nextDays(now: Date, n: number): string[] {
  return Array.from({ length: n }, (_, i) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12).toISOString()));
}

export function rangeText(locale: string, startIso: string, endIso: string): string {
  const f = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  return `${f.format(new Date(startIso))} – ${f.format(new Date(endIso))}`;
}

export function dayText(locale: string, iso: string, withWeekday = true): string {
  return new Intl.DateTimeFormat(locale, { ...(withWeekday ? { weekday: "short" as const } : {}), day: "numeric", month: "short" }).format(new Date(iso));
}

export function whenSummary(locale: string, time: HomeTime | FacilityTime | undefined): string | null {
  if (!time || time.type === "walk_in") return null;
  if (time.type === "slot") return `${new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(time.start))} · ${slotText(locale, time.start)}`;
  return `${dayText(locale, time.start)} · ${rangeText(locale, time.start, time.end)}`;
}

/** Windows answer -> what the picker draws (home needs windows or ASAP; a centre needs slots or walk-in). */
export const hasChoices = (w: WindowsAnswer) => (w.kind === "home" ? w.windows.length > 0 || w.asap : w.kind === "walk_in" ? true : w.slots.length > 0);

// ---------- ASAP broadcast (POST/GET /ordering/asap, backend ordering-broadcast.service.ts shape()) ----------

export type AsapStatus = "broadcasting" | "accepted" | "expired" | "cancelled";
export type Asap = {
  id: string; status: AsapStatus; stage: number; radiusKm: number; secondsLeft: number; bookingId: string | null;
  fallback: { providerId: string; start: string; end: string } | null | undefined;
};

export function parseAsap(payload: unknown): Asap | null {
  const r = obj(payload);
  const id = r && text(r.id);
  const status = r && r.status;
  if (!r || !id || (status !== "broadcasting" && status !== "accepted" && status !== "expired" && status !== "cancelled")) return null;
  if (typeof r.stage !== "number" || typeof r.radius_km !== "number") return null;
  const fb = obj(r.fallback);
  const ew = fb && obj(fb.earliest_window);
  const fallback = !fb ? undefined : ew && text(ew.provider_id) && text(ew.start) && text(ew.end) ? { providerId: ew.provider_id as string, start: ew.start as string, end: ew.end as string } : null;
  return { id, status, stage: r.stage, radiusKm: r.radius_km, secondsLeft: typeof r.seconds_left === "number" ? Math.max(0, r.seconds_left) : 0, bookingId: text(r.booking_id), fallback };
}

export const asapOpen = (a: Asap) => a.status === "broadcasting";

/** m:ss of a number of seconds. */
export function clock(locale: string, seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const nf = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
  return `${new Intl.NumberFormat(locale, { useGrouping: false }).format(Math.floor(s / 60))}:${nf.format(s % 60)}`;
}

// ---------- confirm and pay ----------

export type Evidence = { medicalOrderId?: string; documents?: Array<{ kind: "doctor_request" | "preauth"; url_or_b64: string; filename?: string }> };

/** The POST /ordering/bookings body: the quote, one selection per mode and how the patient pays. `insured` -> payment_method insurance, else card. */
export function buildBookingRequest(a: { schedule: Schedule; home?: string; facility?: string; insured: boolean; gender?: StaffGender; evidence?: Evidence; notes?: string }): BookingRequest | null {
  const selections: BookingRequest["selections"] = {};
  if (a.home) {
    if (!a.schedule.home) return null;
    selections.home = { provider_id: a.home, window: { start: a.schedule.home.start, end: a.schedule.home.end } };
  }
  if (a.facility) {
    const f = a.schedule.facility;
    if (!f) return null;
    selections.facility = { provider_id: a.facility, ...(f.type === "walk_in" ? { walk_in: true } : { slot_id: f.id }) };
  }
  if (!selections.home && !selections.facility) return null;
  return {
    quote_id: a.schedule.quoteId, selections, payment_method: a.insured ? "insurance" : "card",
    ...(a.gender ? { gender_preference: a.gender } : {}),
    ...(a.evidence?.medicalOrderId ? { medical_order_id: a.evidence.medicalOrderId } : {}),
    ...(a.evidence?.documents?.length ? { documents: a.evidence.documents } : {}),
    ...(a.notes ? { notes: a.notes } : {}),
  };
}

/** Insured bookings need the doctor's order or an uploaded request; the pay button stays off until one is attached. */
export const evidenceReady = (insured: boolean, e: Evidence) => !insured || !!e.medicalOrderId || (e.documents?.length ?? 0) > 0;

/** Does an active medical order cover every catalogue id of the booking (what the backend checks: open or later lab items)? */
export function orderCovers(order: { items: Array<{ group: string; catalog_id: string; status: string }> }, ids: string[]): boolean {
  const open = order.items.filter((i) => i.group === "labs" && (i.status === "open" || i.status === "later"));
  return ids.length > 0 && ids.every((id) => open.some((i) => i.catalog_id === id));
}

export const DOC_MAX_CHARS = 2_000_000; // BookingDocumentDto.url_or_b64 @MaxLength
export const MAX_DOCS = 5;

/** Which bookings of the answer are paid now by card: not awaiting approval (insured home visits are dispatched and paid after approval). */
export const payableNow = (b: { status: string }) => b.status !== "awaiting_approval";

export type ModeOf = OrderMode;

/** A centre slot is the provider's own opening hour written as an instant at UTC (backend labs.service.ts `slotsForProvider`): show it as written. */
export const slotText = (locale: string, startIso: string) => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(startIso));
