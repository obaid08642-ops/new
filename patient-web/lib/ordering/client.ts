/** Browser calls of the ordering flow, through the route handlers under /api/ordering (the access token never reaches the browser). */
import { parseAsap, type Asap } from "./schedule";
import { parseBookingResult, type OrderingBookingResult } from "./bookings";
import { parseQuote, type Quote, type QuoteRequest } from "./quote";
import { parseWindows, type WindowsAnswer } from "./windows";

export class OrderingApiError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

async function call(url: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store", headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new OrderingApiError("network", 0);
  }
  const data = await res.json().catch(() => null);
  if (res.status === 429) throw new OrderingApiError("too_many_requests", 429);
  if (!res.ok) throw new OrderingApiError(typeof (data as { message?: unknown } | null)?.message === "string" ? (data as { message: string }).message : "request_failed", res.status);
  return data;
}

export async function requestQuote(body: QuoteRequest, signal?: AbortSignal): Promise<Quote> {
  const q = parseQuote(await call("/api/ordering/quote", { method: "POST", body: JSON.stringify(body), signal }));
  if (!q) throw new OrderingApiError("bad_answer", 502);
  return q;
}

export async function requestWindows(p: { providerId: string; mode: "home" | "facility"; date?: string }): Promise<WindowsAnswer> {
  const qs = new URLSearchParams({ provider_id: p.providerId, mode: p.mode, ...(p.date ? { date: p.date } : {}) });
  const w = parseWindows(await call(`/api/ordering/windows?${qs}`));
  if (!w) throw new OrderingApiError("bad_answer", 502);
  return w;
}

export type BookingRequest = {
  quote_id: string;
  selections: { home?: { provider_id: string; window?: { asap?: boolean; start?: string; end?: string } }; facility?: { provider_id: string; slot_id?: string; walk_in?: boolean } };
  payment_method: "cash" | "card" | "insurance";
  gender_preference?: "female" | "male";
  medical_order_id?: string;
  documents?: Array<{ kind: "doctor_request" | "preauth"; url_or_b64: string; filename?: string }>;
  notes?: string;
};

export async function createBooking(body: BookingRequest): Promise<OrderingBookingResult> {
  const r = parseBookingResult(await call("/api/ordering/bookings", { method: "POST", body: JSON.stringify(body) }));
  if (!r) throw new OrderingApiError("bad_answer", 502);
  return r;
}

export type AsapRequest = { service_kind: "lab" | "radiology" | "nursing"; items: string[]; lat: number; lng: number; payer: "cash" | "insurance" };

async function asapCall(url: string, init?: RequestInit): Promise<Asap> {
  const a = parseAsap(await call(url, init));
  if (!a) throw new OrderingApiError("bad_answer", 502);
  return a;
}
/** POST /ordering/asap: starts the 3 / 5 / 8 km broadcast (one open ASAP per patient: 409 `asap_open`). */
export const startAsap = (body: AsapRequest) => asapCall("/api/ordering/asap", { method: "POST", body: JSON.stringify(body) });
/** GET /ordering/asap/:id: the stage, the seconds left, and after the last stage the fallback window. */
export const readAsap = (id: string, signal?: AbortSignal) => asapCall(`/api/ordering/asap/${encodeURIComponent(id)}`, { signal });
export const cancelAsap = (id: string) => asapCall(`/api/ordering/asap/${encodeURIComponent(id)}/cancel`, { method: "POST" });

export type PaymentIntent = { checkoutUrl: string | null; status: string | null };
/** POST /payments/intent/lab/:bookingId through our route: one intent per booking; the same key returns the same intent (no double charge). */
export async function payBooking(bookingId: string, key: string): Promise<PaymentIntent> {
  const r = await call(`/api/ordering/pay/${encodeURIComponent(bookingId)}`, { method: "POST", headers: { "idempotency-key": key }, body: "{}" });
  const o = r && typeof r === "object" ? (r as Record<string, unknown>) : {};
  return { checkoutUrl: typeof o.checkout_url === "string" && o.checkout_url.startsWith("https://") ? o.checkout_url : null, status: typeof o.status === "string" ? o.status : null };
}
