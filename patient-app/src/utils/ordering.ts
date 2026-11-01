/**
 * M6 ordering (Ord02-Ord07, app): the client of POST /ordering/quote, its types and parsers, and the price maths derived from the
 * quote fields. Backend: backend/src/modules/ordering/ordering.service.ts quote(). Nothing is invented: a field the server did not
 * send is null/absent and the screen shows nothing for it. Reused by the next PR (When picker, Confirm and pay).
 */
import { apiFetch } from './api';

export type OrderingKind = 'lab' | 'radiology' | 'nursing';
export type OrderingMode = 'home' | 'facility';
export type OrderingPayer = 'cash' | 'insurance';
export type OrderingCoverage = 'covered' | 'needs_approval' | 'not_covered';
export type OrderingSort = 'cheapest' | 'nearest' | 'fastest' | 'rating';

export interface OrderingContextBody {
  mode: OrderingMode;
  lat: number;
  lng: number;
  payer: OrderingPayer;
  family_member_id?: string;
  staff_gender?: 'female' | 'male';
}

export interface QuoteRequest { service_kind: OrderingKind; items: string[]; context: OrderingContextBody; sort?: OrderingSort }

export interface ProviderRow {
  provider_id: string;
  name_ar: string | null;
  name_en: string | null;
  total: number;
  /** The server's breakdown of `total`: the home-collection fee inside it and the VAT in it (never worked out here). */
  home_fee: number;
  vat: number;
  vat_rate: number;
  subtotal: number;
  distance_km: number | null;
  rating: number | null;
  in_network: boolean;
  earliest_at: string | null;
  turnaround_hours: number | null;
  /** false when the provider lacks some items of the group; `missing` lists them. */
  covers_all: boolean;
  missing: string[];
}
export interface ItemLine { catalog_id: string; price: number; coverage: OrderingCoverage | null }
/** `estimated_patient_share`: the patient's share worked out from the copay % and cap on their card; null when they did not fill them or this provider does not accept the policy. */
export interface BestMatch extends ProviderRow { items: ItemLine[]; estimated_insurance_share: number; patient_share: number; estimated_patient_share?: number | null }
export interface GroupItem { catalog_id: string; facility_only: boolean }
export interface FromPrice { total: number; providers_count: number }
export interface SplitSuggestion { assignments: Array<{ provider_id: string; catalog_ids: string[] }>; total: number }
export interface EmptyAlternative { type: 'facility_nearby' | 'broadcast' | 'notify_me'; providers_count: number | null; nearest_km: number | null }
export interface QuoteGroup {
  mode: OrderingMode;
  items: GroupItem[];
  from_price: FromPrice | null;
  best_match: BestMatch | null;
  compare: ProviderRow[];
  split_suggestion: SplitSuggestion | null;
  empty: { reason: string; alternatives: EmptyAlternative[] } | null;
}
export interface Quote { quote_id: string; expires_at: string; estimate: boolean; groups: QuoteGroup[]; from_price: FromPrice | null }

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const COVERAGE: OrderingCoverage[] = ['covered', 'needs_approval', 'not_covered'];
const ALT: EmptyAlternative['type'][] = ['facility_nearby', 'broadcast', 'notify_me'];

function parseRow(raw: unknown): ProviderRow | null {
  const r = obj(raw);
  if (!r || typeof r.provider_id !== 'string') return null;
  const total = num(r.total);
  if (total === null) return null;
  return {
    provider_id: r.provider_id, name_ar: str(r.name_ar), name_en: str(r.name_en), total, home_fee: num(r.home_fee) ?? 0, vat: num(r.vat) ?? 0, vat_rate: num(r.vat_rate) ?? 0, subtotal: num(r.subtotal) ?? total,
    distance_km: num(r.distance_km), rating: num(r.rating),
    in_network: r.in_network === true, earliest_at: str(r.earliest_at), turnaround_hours: num(r.turnaround_hours),
    covers_all: r.covers_all !== false, missing: Array.isArray(r.missing) ? r.missing.filter((x): x is string => typeof x === 'string') : [],
  };
}

function parseBest(raw: unknown): BestMatch | null {
  const row = parseRow(raw);
  const r = obj(raw);
  if (!row || !r) return null;
  const items = (Array.isArray(r.items) ? r.items : []).flatMap((x): ItemLine[] => {
    const l = obj(x);
    const price = l ? num(l.price) : null;
    return l && typeof l.catalog_id === 'string' && price !== null ? [{ catalog_id: l.catalog_id, price, coverage: COVERAGE.includes(l.coverage as OrderingCoverage) ? (l.coverage as OrderingCoverage) : null }] : [];
  });
  return { ...row, items, estimated_insurance_share: num(r.estimated_insurance_share) ?? 0, patient_share: num(r.patient_share) ?? row.total, estimated_patient_share: num(r.estimated_patient_share) };
}

function parseFrom(raw: unknown): FromPrice | null {
  const r = obj(raw);
  const total = r ? num(r.total) : null;
  const count = r ? num(r.providers_count) : null;
  return total !== null && count !== null ? { total, providers_count: count } : null;
}

function parseGroup(raw: unknown): QuoteGroup | null {
  const r = obj(raw);
  if (!r || (r.mode !== 'home' && r.mode !== 'facility')) return null;
  const items = (Array.isArray(r.items) ? r.items : []).flatMap((x): GroupItem[] => {
    const i = obj(x);
    return i && typeof i.catalog_id === 'string' ? [{ catalog_id: i.catalog_id, facility_only: i.facility_only === true }] : [];
  });
  const split = obj(r.split_suggestion);
  const assignments = split && Array.isArray(split.assignments)
    ? split.assignments.flatMap((a): SplitSuggestion['assignments'] => {
        const x = obj(a);
        return x && typeof x.provider_id === 'string' && Array.isArray(x.catalog_ids) ? [{ provider_id: x.provider_id, catalog_ids: x.catalog_ids.filter((c): c is string => typeof c === 'string') }] : [];
      })
    : [];
  const emptyRaw = obj(r.empty);
  return {
    mode: r.mode,
    items,
    from_price: parseFrom(r.from_price),
    best_match: parseBest(r.best_match),
    compare: (Array.isArray(r.compare) ? r.compare : []).map(parseRow).filter((x): x is ProviderRow => x !== null),
    split_suggestion: split && num(split.total) !== null && assignments.length > 0 ? { assignments, total: num(split.total) as number } : null,
    empty: emptyRaw
      ? {
          reason: str(emptyRaw.reason) ?? 'no_provider',
          alternatives: (Array.isArray(emptyRaw.alternatives) ? emptyRaw.alternatives : []).flatMap((a): EmptyAlternative[] => {
            const x = obj(a);
            return x && ALT.includes(x.type as EmptyAlternative['type']) ? [{ type: x.type as EmptyAlternative['type'], providers_count: num(x.providers_count), nearest_km: num(x.nearest_km) }] : [];
          }),
        }
      : null,
  };
}

/** A quote answer, or null when it has no id or no group. */
export function parseQuote(payload: unknown): Quote | null {
  const r = obj(payload);
  if (!r || typeof r.quote_id !== 'string') return null;
  const groups = (Array.isArray(r.groups) ? r.groups : []).map(parseGroup).filter((g): g is QuoteGroup => g !== null);
  if (groups.length === 0) return null;
  return { quote_id: r.quote_id, expires_at: str(r.expires_at) ?? '', estimate: r.estimate === true, groups, from_price: parseFrom(r.from_price) };
}

/** POST /ordering/quote. Throws the transport error (see orderingErrorKey). */
export async function requestQuote(req: QuoteRequest): Promise<Quote> {
  const body: Raw = { service_kind: req.service_kind, items: [...new Set(req.items)], context: req.context };
  if (req.sort) body.sort = req.sort;
  const quote = parseQuote(await apiFetch<unknown>('/ordering/quote', { method: 'POST', body: JSON.stringify(body) }));
  if (!quote) throw new Error('invalid_quote');
  return quote;
}

/** Stable error codes of the quote (backend ordering.service.ts) -> the translation key of the message. */
export function orderingErrorKey(error: unknown): string {
  const text = String((error as { message?: unknown } | null)?.message ?? error ?? '');
  if (text.includes('insurance_not_saved')) return 'ordering.err.insuranceNotSaved';
  if (text.includes('unknown_catalog_item')) return 'ordering.err.unknownItem';
  if (text.includes('family_member_not_found')) return 'ordering.err.memberNotFound';
  return 'ordering.err.generic';
}

// ---- maths derived from quote fields (no number of our own) ----

export const providerName = (row: { name_ar: string | null; name_en: string | null }, lang: string): string =>
  (lang === 'ar' ? row.name_ar ?? row.name_en : row.name_en ?? row.name_ar) ?? '';

/** The sum of every group's lowest total, as the quote's own `from_price` (null when a group has no provider). */
export function basketFrom(groups: QuoteGroup[]): FromPrice | null {
  if (groups.length === 0 || groups.some((g) => !g.from_price)) return null;
  return { total: Math.round(groups.reduce((s, g) => s + (g.from_price as FromPrice).total, 0) * 100) / 100, providers_count: Math.min(...groups.map((g) => (g.from_price as FromPrice).providers_count)) };
}

/** Items the split sent to the centre only because the home visit cannot do them. */
export const facilityOnlyIds = (groups: QuoteGroup[]): string[] => groups.flatMap((g) => g.items.filter((i) => i.facility_only).map((i) => i.catalog_id));

/** Estimated insurance share and what the patient pays across the best matches of all groups; null when a group has no best match. */
export function basketShares(groups: QuoteGroup[]): { total: number; insurance: number; patient: number } | null {
  if (groups.length === 0 || groups.some((g) => !g.best_match)) return null;
  const total = groups.reduce((s, g) => s + (g.best_match as BestMatch).total, 0);
  const insurance = groups.reduce((s, g) => s + (g.best_match as BestMatch).estimated_insurance_share, 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { total: r2(total), insurance: r2(insurance), patient: r2(total - insurance) };
}

/** The sort of a compare list on the fields the rows carry. */
export function sortRows(rows: ProviderRow[], sort: OrderingSort | null): ProviderRow[] {
  if (!sort) return rows;
  const finish = (r: ProviderRow) => (r.earliest_at ? Date.parse(r.earliest_at) : Infinity) + (r.turnaround_hours ?? 24) * 3_600_000;
  const by: Record<OrderingSort, (a: ProviderRow, b: ProviderRow) => number> = {
    cheapest: (a, b) => a.total - b.total,
    nearest: (a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity),
    fastest: (a, b) => finish(a) - finish(b),
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  };
  return [...rows].sort((a, b) => by[sort](a, b) || 0);
}

/**
 * The coverage of one item on the best match of a quote made for that item alone, with the server's own estimated shares
 * (for a single item they are that item's: no rate of ours). Null when the quote has no best match or no coverage (cash).
 */
export function itemCoverage(group: QuoteGroup | undefined, catalogId: string): { coverage: OrderingCoverage; price: number; insurance_share: number; patient_share: number } | null {
  const best = group?.best_match;
  const line = best?.items.find((i) => i.catalog_id === catalogId);
  if (!best || !line || !line.coverage) return null;
  return { coverage: line.coverage, price: line.price, insurance_share: best.estimated_insurance_share, patient_share: best.patient_share };
}

/** The items subtotal and the visit fee of the best matches: the fee is the `home_fee` the server states for each. */
export function basketLines(groups: QuoteGroup[]): { items: number; fee: number } | null {
  if (groups.length === 0 || groups.some((g) => !g.best_match)) return null;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const items = groups.reduce((s, g) => s + (g.best_match as BestMatch).items.reduce((a, l) => a + l.price, 0), 0);
  const fee = groups.reduce((s, g) => s + ((g.best_match as BestMatch).home_fee || 0), 0);
  return { items: r2(items), fee: r2(fee) };
}
