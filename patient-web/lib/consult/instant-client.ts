import { parseEarliestSlot, parseInstant, type Instant } from "./instant";

export class InstantApiError extends Error {
  constructor(public readonly code: string, public readonly status: number, public readonly earliestSlot: { doctorId: string | null; startsAt: string } | null = null) { super(code); }
}

async function call(url: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store", headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new InstantApiError("network", 0);
  }
  const data = await res.json().catch(() => null);
  if (res.status === 429) throw new InstantApiError("too_many_requests", 429);
  if (!res.ok) {
    const o = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    throw new InstantApiError(typeof o.message === "string" ? o.message : "request_failed", res.status, parseEarliestSlot(o.earliest_slot));
  }
  return data;
}

async function instant(url: string, init?: RequestInit): Promise<Instant> {
  const i = parseInstant(await call(url, init));
  if (!i) throw new InstantApiError("bad_answer", 502);
  return i;
}

/** POST /consultations/instant. With a booking, the result is attached first (POST /ordering/bookings/:id/results/discuss). */
export async function startInstant(body: { specialty: string; mode: "video" | "audio" }, bookingId?: string | null): Promise<Instant> {
  if (bookingId) await call(`/api/ordering/bookings/${encodeURIComponent(bookingId)}/discuss`, { method: "POST", body: "{}" });
  return instant("/api/consultations/instant", { method: "POST", body: JSON.stringify(body) });
}
export const readInstant = (id: string, signal?: AbortSignal) => instant(`/api/consultations/instant/${encodeURIComponent(id)}`, { signal });
export const cancelInstant = (id: string) => instant(`/api/consultations/instant/${encodeURIComponent(id)}/cancel`, { method: "POST", body: "{}" });
