/**
 * sort=available_today for GET /care/doctors (owner decision 2026-10-24): doctors with a real slot today first, soonest first;
 * then the others by their next free slot; doctors with no slot in the next 14 days last, in the order they came (rating).
 * "Today" is the Riyadh calendar day (UTC+3, no daylight saving).
 */
export const AVAILABILITY_WINDOW = 60;
const RIYADH_MS = 3 * 3600_000;
const riyadhDay = (t: number) => new Date(t + RIYADH_MS).toISOString().slice(0, 10);

export interface WithNext<T> { doc: T; next: string | null }

export function orderByAvailability<T>(items: Array<WithNext<T>>, now = Date.now()): Array<WithNext<T>> {
  const today = riyadhDay(now);
  const t = (n: string | null): number => (n && Number.isFinite(Date.parse(n)) ? Date.parse(n) : Number.POSITIVE_INFINITY);
  const bucket = (x: WithNext<T>): number => (t(x.next) === Number.POSITIVE_INFINITY ? 2 : riyadhDay(t(x.next)) === today ? 0 : 1);
  return items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => bucket(a.x) - bucket(b.x) || t(a.x.next) - t(b.x.next) || a.i - b.i)
    .map((e) => e.x);
}

/** A short in-memory cache so repeated page loads do not recompute every doctor's next slot. */
export class NextSlotCache {
  private readonly map = new Map<string, { at: number; value: string | null }>();
  constructor(private readonly ttlMs = 60_000, private readonly max = 500) {}
  get(id: string, now = Date.now()): { hit: boolean; value: string | null } {
    const e = this.map.get(id);
    return e && now - e.at < this.ttlMs ? { hit: true, value: e.value } : { hit: false, value: null };
  }
  set(id: string, value: string | null, now = Date.now()) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value as string);
    this.map.set(id, { at: now, value });
  }
}
