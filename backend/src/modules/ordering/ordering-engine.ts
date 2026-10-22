// M3 ordering engine: the pure parts (distance, ranking, split suggestion, time windows). No database here, so every
// rule can be tested on its own; OrderingService does the loading and the writing.

export type Mode = 'home' | 'facility';

export interface Candidate {
  /** Public id of the provider (never the account id). */
  provider_id: string;
  name_ar: string | null;
  name_en: string | null;
  rating: number | null;
  reliability: number | null;
  distance_km: number;
  in_network: boolean;
  /** catalog_id -> locked-at-quote price for the mode of the group. */
  prices: Record<string, number>;
  home_fee: number;
  turnaround_hours: number | null;
  earliest_at: Date;
  /** catalog_id -> coverage estimate (insurance quotes only). */
  coverage: Record<string, 'covered' | 'needs_approval' | 'not_covered'>;
}

export interface RankingWeights { coverage: number; network: number; distance: number; speed: number; rating: number; reliability: number; price: number }

/** Owner-editable through SystemConfig `ordering_ranking_weights`; these are the defaults (price is off unless set). */
export const DEFAULT_WEIGHTS: RankingWeights = { coverage: 30, network: 20, distance: 20, speed: 10, rating: 10, reliability: 10, price: 0 };

export function mergeWeights(raw: unknown): RankingWeights {
  const out = { ...DEFAULT_WEIGHTS };
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(out) as Array<keyof RankingWeights>) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1000) out[k] = v;
    }
  }
  return out;
}

const R = 6371;
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function totalOf(c: Candidate, catalogIds: string[], mode: Mode): number {
  return round2(catalogIds.reduce((s, id) => s + (c.prices[id] ?? 0), 0) + (mode === 'home' ? c.home_fee : 0));
}

/** 0..1, higher is better, relative to the other candidates (a lone candidate scores 1 on a relative axis). */
function relative(values: number[], v: number, lowerIsBetter: boolean): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 1;
  return lowerIsBetter ? (max - v) / (max - min) : (v - min) / (max - min);
}

/**
 * Score every candidate. Coverage is 1 for a provider that offers every item (only such providers are ranked here); network
 * is 1 for an in-network provider on an insurance quote and neutral (1 for all) for a cash quote.
 */
export function rank(cands: Candidate[], catalogIds: string[], mode: Mode, payer: 'cash' | 'insurance', weights: RankingWeights): Array<{ c: Candidate; total: number; score: number }> {
  if (!cands.length) return [];
  const totals = cands.map((c) => totalOf(c, catalogIds, mode));
  const dists = cands.map((c) => c.distance_km);
  const speeds = cands.map((c) => c.earliest_at.getTime() + (c.turnaround_hours ?? 24) * 3_600_000);
  const sum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  return cands.map((c, i) => {
    const parts = {
      coverage: 1,
      network: payer === 'insurance' ? (c.in_network ? 1 : 0) : 1,
      distance: relative(dists, c.distance_km, true),
      speed: relative(speeds, speeds[i], true),
      rating: c.rating == null ? 0.5 : Math.max(0, Math.min(1, c.rating / 5)),
      reliability: c.reliability == null ? 0.5 : Math.max(0, Math.min(1, c.reliability)),
      price: relative(totals, totals[i], true),
    };
    const score = (Object.keys(parts) as Array<keyof typeof parts>).reduce((s, k) => s + parts[k] * weights[k], 0) / sum;
    return { c, total: totals[i], score };
  }).sort((x, y) => y.score - x.score || x.total - y.total || x.c.provider_id.localeCompare(y.c.provider_id));
}

export type SortKey = 'cheapest' | 'nearest' | 'fastest' | 'rating';

export function sortCompare<T extends { c: Candidate; total: number; score: number }>(rows: T[], sort: SortKey | undefined): T[] {
  const by: Record<SortKey, (a: T, b: T) => number> = {
    cheapest: (a, b) => a.total - b.total,
    nearest: (a, b) => a.c.distance_km - b.c.distance_km,
    fastest: (a, b) => (a.c.earliest_at.getTime() + (a.c.turnaround_hours ?? 24) * 3_600_000) - (b.c.earliest_at.getTime() + (b.c.turnaround_hours ?? 24) * 3_600_000),
    rating: (a, b) => (b.c.rating ?? 0) - (a.c.rating ?? 0),
  };
  if (!sort || !by[sort]) return rows;
  return [...rows].sort((a, b) => by[sort](a, b) || b.score - a.score);
}

/**
 * When no single provider offers every item: the split with the fewest providers (at most 3), then the lowest total
 * (each item at the cheapest provider of the chosen set; a home visit pays one fee per provider). Null when even three
 * providers cannot cover the basket.
 */
export function suggestSplit(cands: Candidate[], catalogIds: string[], mode: Mode): { assignments: Array<{ provider_id: string; catalog_ids: string[] }>; total: number } | null {
  const pool = [...cands]
    .filter((c) => catalogIds.some((id) => c.prices[id] != null))
    .sort((a, b) => catalogIds.filter((id) => b.prices[id] != null).length - catalogIds.filter((id) => a.prices[id] != null).length || a.provider_id.localeCompare(b.provider_id))
    .slice(0, 14);
  let best: { assignments: Array<{ provider_id: string; catalog_ids: string[] }>; total: number } | null = null;
  const consider = (set: Candidate[]) => {
    const per = new Map<string, string[]>();
    let total = 0;
    for (const id of catalogIds) {
      let pick: Candidate | null = null;
      for (const c of set) if (c.prices[id] != null && (!pick || c.prices[id] < pick.prices[id])) pick = c;
      if (!pick) return;
      total += pick.prices[id];
      per.set(pick.provider_id, [...(per.get(pick.provider_id) ?? []), id]);
    }
    if (per.size !== set.length) return; // a provider of the set got no item: a smaller set already covers it
    if (mode === 'home') for (const pid of per.keys()) total += set.find((c) => c.provider_id === pid)!.home_fee;
    total = round2(total);
    if (!best || total < best.total) {
      best = { assignments: [...per.entries()].map(([provider_id, catalog_ids]) => ({ provider_id, catalog_ids })).sort((a, b) => a.provider_id.localeCompare(b.provider_id)), total };
    }
  };
  for (const size of [2, 3]) {
    const pick = (start: number, set: Candidate[]) => {
      if (set.length === size) { consider(set); return; }
      for (let i = start; i < pool.length; i++) pick(i + 1, [...set, pool[i]]);
    };
    pick(0, []);
    if (best) return best;
  }
  return null;
}

/** Riyadh has no daylight saving: a fixed +3 h offset. Home visits run 08:00-20:00 local, in 2-hour windows. */
const OFFSET_MS = 3 * 3_600_000;
export const WINDOW_MS = 2 * 3_600_000;
const FIRST_HOUR = 8;
const LAST_HOUR = 20;

export interface TimedWindow { start: string; end: string; asap?: false }

/** 2-hour windows for the next `days` days (today counted), none already started, as ISO instants. */
export function homeWindows(now: Date, days = 3): TimedWindow[] {
  const out: TimedWindow[] = [];
  const localMidnight = Math.floor((now.getTime() + OFFSET_MS) / 86_400_000) * 86_400_000 - OFFSET_MS;
  for (let d = 0; d < days; d++) {
    for (let h = FIRST_HOUR; h < LAST_HOUR; h += 2) {
      const start = localMidnight + d * 86_400_000 + h * 3_600_000;
      if (start <= now.getTime()) continue;
      out.push({ start: new Date(start).toISOString(), end: new Date(start + WINDOW_MS).toISOString() });
    }
  }
  return out;
}

export function isOfferedWindow(now: Date, start: unknown, end: unknown): boolean {
  if (typeof start !== 'string' || typeof end !== 'string') return false;
  return homeWindows(now).some((w) => w.start === new Date(start).toISOString() && w.end === new Date(end).toISOString());
}

/** About 1 km: coverage gaps are counted per cell, never per person. */
export function areaKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}
