/** Browser calls of the ordering flow, through the route handlers under /api/ordering (the access token never reaches the browser). */
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
  notes?: string;
};

export async function createBooking(body: BookingRequest): Promise<OrderingBookingResult> {
  const r = parseBookingResult(await call("/api/ordering/bookings", { method: "POST", body: JSON.stringify(body) }));
  if (!r) throw new OrderingApiError("bad_answer", 502);
  return r;
}
