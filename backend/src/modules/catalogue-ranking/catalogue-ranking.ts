/**
 * Popularity ranking of the lab, radiology and nursing catalogues (owner request, 2026-10-29), the same idea as the pharmacy's smart_ranking: the most visited,
 * searched, added to a cart and ordered services first.
 *   - Signals are counted per service and per DAY (`catalogue_ranking_daily`): no user, session or address is stored, only counters. Views and searches come from the
 *     clients (the public events endpoint); cart adds are counted by the server itself (the cart service); orders are recounted from the bookings by the ranking job.
 *   - Bots are not counted (user-agent filter), and one visitor counts once per service and signal in a short window (a salted hash held in Redis for minutes, never stored).
 *   - The ranking job turns the last 90 days of counters into `rank_score` on each catalogue row (weights: order 5, cart add 3, search 1.5, view 1; a half-life of 30 days),
 *     and the public lists sort by it by default (`sort=smart_ranking`), with `popularity` and the name as tie-breaks.
 */
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';

export const RANKED_VERTICALS = ['lab', 'radiology', 'nursing'] as const;
export type RankedVertical = (typeof RANKED_VERTICALS)[number];
export const RANK_COLLECTION: Record<RankedVertical, string> = {
  lab: CATALOG_COLLECTIONS.lab_services,
  radiology: CATALOG_COLLECTIONS.radiology_services,
  nursing: CATALOG_COLLECTIONS.nursing_services,
};
export const DAILY_COLLECTION = 'catalogue_ranking_daily';

export type RankingSignal = 'view' | 'search' | 'cart_add';
/** What a browser or an app may report. Cart adds are counted by the server; orders are recounted from the bookings. */
export const CLIENT_SIGNALS: readonly RankingSignal[] = ['view', 'search'];
export const SIGNAL_FIELD: Record<RankingSignal, 'views' | 'searches' | 'cart_adds'> = { view: 'views', search: 'searches', cart_add: 'cart_adds' };

export const WINDOW_DAYS = 90;
const num = (v: string | undefined, d: number): number => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
export const weights = (env: NodeJS.ProcessEnv = process.env) => ({
  order: num(env.CATALOGUE_RANK_W_ORDER, 5), cart_add: num(env.CATALOGUE_RANK_W_CART_ADD, 3), search: num(env.CATALOGUE_RANK_W_SEARCH, 1.5), view: num(env.CATALOGUE_RANK_W_VIEW, 1),
  half_life_days: num(env.CATALOGUE_RANK_HALF_LIFE_DAYS, 30),
});

/** Crawlers, headless browsers and scripts. An empty user agent is not a browser or an app either. */
const BOT_UA = /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|curl|wget|python-requests|python-urllib|aiohttp|httpclient|okhttp\/[0-9.]+ \(bot|java\/|go-http|axios|node-fetch|undici|monitor|uptime|facebookexternalhit|preview|scrapy|libwww|postman/i;
export const isBotUserAgent = (ua: unknown): boolean => typeof ua !== 'string' || ua.trim().length < 8 || BOT_UA.test(ua);

export const dayKey = (d: Date): string => d.toISOString().slice(0, 10);
export const SERVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export interface DayCounts { service_id: string; day: string; views?: number; searches?: number; cart_adds?: number; orders?: number }

/** The score of every service: the weighted counters of each day, decayed by the day's age. Days outside the window are ignored. */
export function scoreServices(rows: DayCounts[], now: Date, env: NodeJS.ProcessEnv = process.env): Map<string, number> {
  const w = weights(env);
  const out = new Map<string, number>();
  const today = Date.parse(`${dayKey(now)}T00:00:00Z`);
  for (const r of rows) {
    const age = Math.max(0, Math.round((today - Date.parse(`${r.day}T00:00:00Z`)) / 86_400_000));
    if (!Number.isFinite(age) || age > WINDOW_DAYS) continue;
    const raw = (r.orders ?? 0) * w.order + (r.cart_adds ?? 0) * w.cart_add + (r.searches ?? 0) * w.search + (r.views ?? 0) * w.view;
    if (raw <= 0) continue;
    out.set(r.service_id, (out.get(r.service_id) ?? 0) + raw * Math.pow(0.5, age / w.half_life_days));
  }
  for (const [k, v] of out) out.set(k, Math.round(v * 100) / 100);
  return out;
}

export type CatalogueSort = 'smart_ranking' | 'popularity';
/** Unknown values fall back to smart_ranking (never an error on user input). */
export const normalizeCatalogueSort = (s: unknown): CatalogueSort => (s === 'popularity' ? 'popularity' : 'smart_ranking');
/** The Mongo sort of a list: services with signals first by score, then the editorial `popularity`, then the name (a stable order). */
export function catalogueSortSpec(sort: unknown): Record<string, 1 | -1> {
  return normalizeCatalogueSort(sort) === 'popularity' ? { popularity: -1, name_ar: 1 } : { rank_score: -1, popularity: -1, name_ar: 1 };
}
