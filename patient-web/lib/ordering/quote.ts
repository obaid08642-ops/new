/**
 * Ordering quote (M6 Ord02-Ord05): the types of POST /ordering/quote and the parser that reads its answer
 * (backend/src/modules/ordering/ordering.service.ts `quote`). Nothing here is invented: every field is one the endpoint sends,
 * and a field it does not send is absent here. Prices are the ones the server computed; the only arithmetic done on the client is
 * summing lines the server returned (see `summarize`).
 */

export type ServiceKind = "lab" | "radiology" | "nursing";
export type OrderMode = "home" | "facility";
export type Payer = "cash" | "insurance";
export type Coverage = "covered" | "needs_approval" | "not_covered";
export type SortKey = "cheapest" | "nearest" | "fastest" | "rating";
export type StaffGender = "female" | "male";

export type QuoteContext = { mode: OrderMode; lat: number; lng: number; payer: Payer; family_member_id?: string; staff_gender?: StaffGender };
export type QuoteRequest = { service_kind: ServiceKind; items: string[]; context: QuoteContext; sort?: SortKey };

export type QuoteLine = { catalogId: string; price: number; coverage?: Coverage };
export type ProviderRow = {
  providerId: string;
  nameAr: string | null;
  nameEn: string | null;
  total: number;
  distanceKm: number | null;
  rating: number | null;
  inNetwork: boolean;
  earliestAt: string | null;
  turnaroundHours: number | null;
  /** false when the provider lacks some of the items; `missing` lists them. */
  coversAll: boolean;
  missing: string[];
};
export type BestMatch = ProviderRow & { lines: QuoteLine[]; estimatedInsuranceShare: number; patientShare: number };
export type EmptyAlternative = { type: "facility_nearby"; providersCount: number; nearestKm: number } | { type: "broadcast" } | { type: "notify_me" };
export type QuoteGroup = {
  mode: OrderMode;
  items: Array<{ catalogId: string; facilityOnly: boolean }>;
  fromPrice: { total: number; providersCount: number } | null;
  bestMatch: BestMatch | null;
  compare: ProviderRow[];
  split: { assignments: Array<{ providerId: string; catalogIds: string[] }>; total: number } | null;
  empty: { reason: string; alternatives: EmptyAlternative[] } | null;
};
export type Quote = { quoteId: string; expiresAt: string; estimate: boolean; groups: QuoteGroup[]; fromPrice: { total: number; providersCount: number } | null };

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const COVERAGE = new Set(["covered", "needs_approval", "not_covered"]);

function parseRow(v: unknown): ProviderRow | null {
  const r = obj(v);
  const providerId = r && str(r.provider_id);
  const total = r && num(r.total);
  if (!r || !providerId || total === null) return null;
  const missing = Array.isArray(r.missing) ? r.missing.filter((x): x is string => typeof x === "string") : [];
  return {
    providerId, nameAr: str(r.name_ar), nameEn: str(r.name_en), total, distanceKm: num(r.distance_km), rating: num(r.rating),
    inNetwork: r.in_network === true, earliestAt: str(r.earliest_at), turnaroundHours: num(r.turnaround_hours),
    coversAll: r.covers_all !== false, missing,
  };
}

function parseBest(v: unknown): BestMatch | null {
  const r = obj(v);
  const row = parseRow(v);
  if (!r || !row) return null;
  const lines = (Array.isArray(r.items) ? r.items : []).flatMap((x): QuoteLine[] => {
    const l = obj(x);
    const id = l && str(l.catalog_id);
    const price = l && num(l.price);
    if (!l || !id || price === null) return [];
    return [{ catalogId: id, price, ...(typeof l.coverage === "string" && COVERAGE.has(l.coverage) ? { coverage: l.coverage as Coverage } : {}) }];
  });
  return { ...row, lines, estimatedInsuranceShare: num(r.estimated_insurance_share) ?? 0, patientShare: num(r.patient_share) ?? row.total };
}

const parseFrom = (v: unknown) => {
  const r = obj(v);
  const total = r && num(r.total);
  const count = r && num(r.providers_count);
  return total !== null && total !== undefined && count !== null && count !== undefined ? { total, providersCount: count } : null;
};

function parseEmpty(v: unknown): QuoteGroup["empty"] {
  const r = obj(v);
  if (!r) return null;
  const alternatives = (Array.isArray(r.alternatives) ? r.alternatives : []).flatMap((x): EmptyAlternative[] => {
    const a = obj(x);
    if (!a) return [];
    if (a.type === "facility_nearby") return [{ type: "facility_nearby", providersCount: num(a.providers_count) ?? 0, nearestKm: num(a.nearest_km) ?? 0 }];
    if (a.type === "broadcast" || a.type === "notify_me") return [{ type: a.type }];
    return [];
  });
  return { reason: str(r.reason) ?? "no_provider", alternatives };
}

function parseGroup(v: unknown): QuoteGroup | null {
  const r = obj(v);
  if (!r || (r.mode !== "home" && r.mode !== "facility")) return null;
  const items = (Array.isArray(r.items) ? r.items : []).flatMap((x) => {
    const i = obj(x);
    const id = i && str(i.catalog_id);
    return i && id ? [{ catalogId: id, facilityOnly: i.facility_only === true }] : [];
  });
  const s = obj(r.split_suggestion);
  const assignments = s && Array.isArray(s.assignments)
    ? s.assignments.flatMap((a) => {
        const x = obj(a);
        const providerId = x && str(x.provider_id);
        const ids = x && Array.isArray(x.catalog_ids) ? x.catalog_ids.filter((c): c is string => typeof c === "string") : [];
        return x && providerId ? [{ providerId, catalogIds: ids }] : [];
      })
    : [];
  const splitTotal = s && num(s.total);
  return {
    mode: r.mode, items, fromPrice: parseFrom(r.from_price), bestMatch: parseBest(r.best_match),
    compare: (Array.isArray(r.compare) ? r.compare : []).flatMap((x) => { const p = parseRow(x); return p ? [p] : []; }),
    split: assignments.length && splitTotal !== null && splitTotal !== undefined ? { assignments, total: splitTotal } : null,
    empty: parseEmpty(r.empty),
  };
}

export function parseQuote(payload: unknown): Quote | null {
  const r = obj(payload);
  const quoteId = r && str(r.quote_id);
  if (!r || !quoteId || !Array.isArray(r.groups)) return null;
  return {
    quoteId, expiresAt: str(r.expires_at) ?? "", estimate: r.estimate === true,
    groups: r.groups.flatMap((g) => { const p = parseGroup(g); return p ? [p] : []; }),
    fromPrice: parseFrom(r.from_price),
  };
}

export type QuoteSummary = { itemsTotal: number; homeFee: number; insuranceShare: number; patientShare: number; total: number; complete: boolean };

/**
 * The basket's price summary from the best match of each group: items are the sum of the line prices the server returned, the home fee is
 * the best match's total minus those lines, the insurance share and the patient share are the server's numbers. `complete` is false when a
 * group has no best match (no single provider, or none at all): then the sum is only of the groups that have one and the screen says so.
 */
export function summarize(groups: QuoteGroup[]): QuoteSummary {
  let itemsTotal = 0;
  let homeFee = 0;
  let insuranceShare = 0;
  let patientShare = 0;
  let complete = groups.length > 0;
  for (const g of groups) {
    const b = g.bestMatch;
    if (!b) { complete = false; continue; }
    const lines = Math.round(b.lines.reduce((s, l) => s + l.price, 0) * 100) / 100;
    itemsTotal += lines;
    homeFee += Math.max(0, Math.round((b.total - lines) * 100) / 100);
    insuranceShare += b.estimatedInsuranceShare;
    patientShare += b.patientShare;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { itemsTotal: r2(itemsTotal), homeFee: r2(homeFee), insuranceShare: r2(insuranceShare), patientShare: r2(patientShare), total: r2(patientShare), complete };
}

/** The stable error codes the ordering endpoints answer, mapped to the OrderingFlow message key that explains them. */
const ERROR_KEYS: Record<string, string> = {
  unknown_catalog_item: "errUnknownItem",
  insurance_not_saved: "errInsuranceNotSaved",
  family_member_not_found: "errGeneric",
  quote_expired: "errQuoteExpired",
  quote_already_booked: "errQuoteBooked",
  quote_not_found: "errQuoteExpired",
  authentication_required: "errSignIn",
  provider_not_found: "errGeneric",
};

export function orderingErrorKey(code: unknown): string {
  return typeof code === "string" && ERROR_KEYS[code] ? ERROR_KEYS[code] : "errGeneric";
}

/** The group the provider was suggested for, and how many providers pass the filters (the compare list is already the server's order). */
export type CompareFilters = { inNetworkOnly: boolean };
export function filterCompare(rows: ProviderRow[], f: CompareFilters): ProviderRow[] {
  return f.inNetworkOnly ? rows.filter((r) => r.inNetwork) : rows;
}
