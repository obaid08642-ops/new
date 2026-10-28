/**
 * What providers offer for each catalogue service (owner, 2026-10-28: the patient lists read the CATALOGUE, and every item carries its offers).
 * One reader for the three diagnostics/care verticals, so the lists, the detail pages and the filters agree:
 *
 *   lab        provider_capabilities_lab        row = { code, name_ar, price, available, home_collection_supported, insurance_covered, premises_supported? }
 *              plus the lab profile's `test_categories` (a test id or its category)
 *   radiology  provider_capabilities_radiology  row = { service_id?, scan_type, body_part, price, available, insurance_covered, home_supported?, premises_supported? }
 *              plus the centre profile's `equipment_list` (a scan id or its modality)
 *   nursing    provider_profiles.nursing_services[] = { key (the service id), price, home?, premises?, insurance? }
 *
 * The provider's own choice per service lives in `provider_service_offers` (see PROVIDER_OFFERS_COLLECTION): { provider_account_id, vertical, service_id, offered,
 * where: premises|home|both, insurance, price }. When a provider has such a row for a service it decides (offered false = the provider does not offer it, whatever the
 * older sources say); the older sources above stay as the fallback for providers that never used it.
 * An offer exists when the provider is approved and active and either has an available capability row for the service or lists it on its profile.
 * `price` is null when the provider offers it without a price: the patient list then shows no price ("from X" only when someone priced it).
 * Nothing here is private: the provider card is the same public card the carousels use (no contact, no account details).
 */
export type Vertical = 'lab' | 'radiology' | 'nursing';

export interface DbHandle { collection(name: string): { find(filter: Record<string, unknown>, options?: Record<string, unknown>): { toArray(): Promise<any[]> } } }

export interface ServiceOffer {
  provider: { id: string; name_ar: string | null; name_en: string | null; logo: string | null; rating: number | null; rating_count: number };
  price: number | null; currency: string;
  premises: boolean; home: boolean; insurance: boolean;
}
export interface OfferSummary { providers_count: number; from_price: number | null; premises_available: boolean; home_available: boolean; insurance_accepted: boolean }

/** The provider's own per-service options (offered, where, insurance, price): one row per provider and catalogue service. */
export const PROVIDER_OFFERS_COLLECTION = 'provider_service_offers';
export type OfferWhere = 'premises' | 'home' | 'both';
export const whereFlags = (where: unknown): { premises: boolean; home: boolean } => ({ premises: where !== 'home', home: where === 'home' || where === 'both' });

export const PROVIDER_TYPES: Record<Vertical, string[]> = { lab: ['lab', 'hospital'], radiology: ['radiology', 'hospital'], nursing: ['home_care', 'nursing', 'nurse'] };
const CAPABILITY: Partial<Record<Vertical, string>> = { lab: 'provider_capabilities_lab', radiology: 'provider_capabilities_radiology' };
const ci = (s: unknown) => String(s ?? '').trim().toLowerCase();
const publicCard = (p: any): ServiceOffer['provider'] => ({ id: p.account_id, name_ar: p.name_ar ?? null, name_en: p.name_en ?? null, logo: p.logo ?? null, rating: p.rating_count > 0 ? p.rating_avg : null, rating_count: p.rating_count || 0 });
const priced = (n: unknown): number | null => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null);

/** service id -> its offers (one per provider, the cheapest priced one when a provider holds several rows), cheapest first, unpriced last. */
export async function loadOffers(db: DbHandle, vertical: Vertical, services: any[]): Promise<Map<string, ServiceOffer[]>> {
  const out = new Map<string, ServiceOffer[]>();
  for (const s of services) out.set(s.id, []);
  if (!services.length) return out;
  const profiles: any[] = await db.collection('provider_profiles').find({
    type: { $in: PROVIDER_TYPES[vertical] }, status: 'active', public_eligibility: true, medical_review_status: 'approved', account_id: { $exists: true, $ne: null },
  }, { projection: { _id: 0, account_id: 1, name_ar: 1, name_en: 1, logo: 1, rating_avg: 1, rating_count: 1, home_visit_supported: 1, test_categories: 1, equipment_list: 1, nursing_services: 1 } }).toArray();
  if (!profiles.length) return out;
  const accounts = profiles.map((p) => p.account_id);
  const capsColl = CAPABILITY[vertical];
  const caps: any[] = capsColl ? await db.collection(capsColl).find({ provider_account_id: { $in: accounts }, available: true }, { projection: { _id: 0 } }).toArray() : [];
  const chosen = new Map<string, any>();
  for (const r of await db.collection(PROVIDER_OFFERS_COLLECTION).find({ provider_account_id: { $in: accounts }, vertical }, { projection: { _id: 0 } }).toArray()) chosen.set(`${r.provider_account_id}|${r.service_id}`, r);
  const put = (svc: any, p: any, o: Omit<ServiceOffer, 'provider'>) => {
    const list = out.get(svc.id)!;
    const i = list.findIndex((x) => x.provider.id === p.account_id);
    const offer: ServiceOffer = { provider: publicCard(p), ...o };
    if (i < 0) list.push(offer);
    else {
      const cur = list[i];
      list[i] = { ...cur, price: cur.price === null ? offer.price : offer.price === null ? cur.price : Math.min(cur.price, offer.price), premises: cur.premises || offer.premises, home: cur.home || offer.home, insurance: cur.insurance || offer.insurance };
    }
  };
  for (const p of profiles) {
    for (const svc of services) {
      const own = chosen.get(`${p.account_id}|${svc.id}`);
      if (own) {
        // the provider's own choice decides, whatever the older sources say
        if (own.offered === true) put(svc, p, { price: priced(own.price), currency: own.currency || 'SAR', ...whereFlags(own.where), insurance: own.insurance === true });
        continue;
      }
      if (vertical === 'lab') {
        const own = caps.filter((c) => c.provider_account_id === p.account_id && (c.code === svc.id || (svc.short_code && c.code === svc.short_code) || (svc.name_ar && c.name_ar === svc.name_ar)));
        for (const c of own) put(svc, p, { price: priced(c.price), currency: c.currency || 'SAR', premises: c.premises_supported !== false, home: !!(c.home_collection_supported || c.home_supported), insurance: !!c.insurance_covered });
        const listed = Array.isArray(p.test_categories) && (p.test_categories.includes(svc.id) || (!!svc.category && p.test_categories.includes(svc.category)));
        if (!own.length && listed) put(svc, p, { price: null, currency: 'SAR', premises: true, home: !!(p.home_visit_supported && svc.home_visit_supported), insurance: false });
      } else if (vertical === 'radiology') {
        const own = caps.filter((c) => c.provider_account_id === p.account_id && (c.service_id ? c.service_id === svc.id
          : ci(c.scan_type) === ci(svc.modality) && (!svc.body_part || ci(c.body_part) === ci(svc.body_part))));
        for (const c of own) put(svc, p, { price: priced(c.price), currency: c.currency || 'SAR', premises: c.premises_supported !== false, home: !!c.home_supported, insurance: !!c.insurance_covered });
        const listed = Array.isArray(p.equipment_list) && (p.equipment_list.includes(svc.id) || (!!svc.modality && p.equipment_list.includes(svc.modality)));
        if (!own.length && listed) put(svc, p, { price: null, currency: 'SAR', premises: true, home: !!(p.home_visit_supported && svc.home_visit_supported), insurance: false });
      } else {
        const entry = (Array.isArray(p.nursing_services) ? p.nursing_services : []).find((n: any) => n?.key === svc.id);
        if (entry) put(svc, p, { price: priced(entry.price), currency: entry.currency || 'SAR', premises: entry.premises === true, home: entry.home !== false, insurance: entry.insurance === true });
      }
    }
  }
  for (const list of out.values()) list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  return out;
}

export function summarize(offers: ServiceOffer[]): OfferSummary {
  const prices = offers.map((o) => o.price).filter((p): p is number => p !== null);
  return {
    providers_count: new Set(offers.map((o) => o.provider.id)).size,
    from_price: prices.length ? Math.min(...prices) : null,
    premises_available: offers.some((o) => o.premises),
    home_available: offers.some((o) => o.home),
    insurance_accepted: offers.some((o) => o.insurance),
  };
}

export interface OfferFilters { home_only?: boolean; insurance?: boolean }

/** The rows with their offer summary (never the offers themselves: the list stays small), filtered by what providers actually offer. */
export async function withOfferSummary<T extends { id: string }>(db: DbHandle, vertical: Vertical, rows: T[], filters: OfferFilters = {}): Promise<Array<T & OfferSummary>> {
  const offers = await loadOffers(db, vertical, rows);
  let out = rows.map((r) => ({ ...r, ...summarize(offers.get(r.id) ?? []) }));
  if (filters.home_only) out = out.filter((r) => r.home_available);
  if (filters.insurance) out = out.filter((r) => r.insurance_accepted);
  return out;
}

/** One service with its full offers (provider card, price, where, insurance) and the summary. */
export async function withOffers<T extends { id: string }>(db: DbHandle, vertical: Vertical, row: T): Promise<T & OfferSummary & { offers: ServiceOffer[] }> {
  const offers = (await loadOffers(db, vertical, [row])).get(row.id) ?? [];
  return { ...row, ...summarize(offers), offers };
}

/**
 * For the older "compare prices" lists: the providers that made their own choice for this service. `hidden` are those who chose NOT to offer it (an older
 * capability row of theirs must not show), `offers` those who offer it with a price (to add to the older rows of providers without a choice).
 */
export async function ownChoices(db: DbHandle, vertical: Vertical, svc: { id: string }): Promise<{ hidden: Set<string>; offers: ServiceOffer[] }> {
  const rows = await db.collection(PROVIDER_OFFERS_COLLECTION).find({ vertical, service_id: svc.id }, { projection: { _id: 0, provider_account_id: 1, offered: 1 } }).toArray();
  const chosen = new Set(rows.map((r) => r.provider_account_id as string));
  const hidden = new Set(rows.filter((r) => r.offered !== true).map((r) => r.provider_account_id as string));
  const all = (await loadOffers(db, vertical, [svc])).get(svc.id) ?? [];
  return { hidden, offers: all.filter((o) => chosen.has(o.provider.id) && o.price !== null) };
}
