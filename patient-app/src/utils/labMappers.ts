/**
 * Normalizers for labs/radiology catalogue payloads.
 * The backend returns DB-shaped documents (name_ar/name_en, preparation_ar,
 * fasting_required, included_services, turnaround_hours…) while the UI cards
 * expect friendly fields (name, desc, price, testsList…).
 * Mapping happens here — no screen invents or hardcodes content, and no value
 * is made up: a field the server did not send stays empty (null / [] / false)
 * and the screen shows nothing for it. How a service looks (glyph, tone) is
 * the screen's business (DiagKit.diagLook, from `category`); the words
 * (fasting, turnaround) come from the translation files.
 */
import { pickDbField } from './localize';
import { offerSummaryOf, offersOf, type OfferSummary, type ServiceOffer } from './catalogueOffers';

type Raw = Record<string, unknown>;

export interface CatalogItem {
  id: string;
  name: string;
  desc: string;
  image: string | undefined;
  price: number | null;
  oldPrice: number | null;
  category: string;
  /** Lab: the sample (blood, urine, stool ...). Scans: the modality and its category (mri, ct, ultrasound ...) and the body part. They only feed the category illustration. */
  sampleType: string;
  modality: string;
  bodyPart: string;
  /** Every name the row holds (any language), for the category mapping. */
  allNames: string[];
  /** The backend's own request score (`popularity`); the lists arrive sorted by it. 0 when the row has none. */
  popularity: number;
  /** The mean rating (0-5) of the labs / centres that run the service and the ratings behind it; null / 0 while unrated (the server sends them when the list is sorted by rating). */
  rating: number | null;
  ratingCount: number;
  /** The names of the tests a package includes. */
  testsList: string[];
  testsCount: number;
  /** The preparation steps the server listed, in the language asked. */
  preparation: string[];
  fastingRequired: boolean;
  /** false when the server did not send `fasting_required`: the card then says nothing about fasting instead of "no fasting" */
  fastingKnown?: boolean;
  fastingHours: number | null;
  turnaroundHours: number | null;
  homeVisit: boolean;
  facilityVisit: boolean;
  /** Radiology: a portable scan that can be done at home (`portable_ultrasound`). */
  portable?: boolean;
  isPopular: boolean;
  /** Decision 30: the service can be booked on insurance (`insurance_availability: true`). */
  insurance: boolean;
  /** Decision 30: the service can be paid by the patient (`cash_availability` not false). */
  selfPay: boolean;
  /** What providers offer for it (the catalogue's summary and, on a detail, the offers); null when the payload has none. */
  offer: OfferSummary | null;
  offers: ServiceOffer[];
}

const asText = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const asNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);

export function normalizeLabService(raw: unknown): CatalogItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const prepAr = asList(r.preparation_ar);
  const prepEn = asList(r.preparation_en);
  const lang = pickDbField<string>({ preparation_ar: prepAr.join('\n'), preparation_en: prepEn.join('\n') }, 'preparation') ?? '';
  const included = Array.isArray(r.included_services) ? r.included_services : [];
  const testsList = included
    .map((t): string => (typeof t === 'string' ? t : t && typeof t === 'object' ? asText(pickDbField(t, 'name') ?? (t as Raw).name_ar ?? (t as Raw).name_en ?? (t as Raw).name) : ''))
    .filter(Boolean);
  return {
    id: asText(r.id ?? r._id),
    name: asText(pickDbField(r, 'name') ?? r.name_ar ?? r.name_en ?? r.name),
    desc: asText(pickDbField(r, 'description')) || (lang ? lang.split('\n').join(', ') : '') || asText(r.category),
    image: asText(r.image_url) || undefined,
    price: asNumber(r.price ?? r.base_price),
    oldPrice: asNumber(r.old_price),
    category: asText(r.category),
    sampleType: asText(r.sample_type),
    modality: [asText(r.modality), asText(r.modality_category)].filter(Boolean).join(' '),
    bodyPart: asText(r.body_part),
    allNames: ['name', 'name_ar', 'name_en', 'name_ur', 'name_hi', 'name_bn', 'name_tl'].map((key) => asText(r[key])).filter(Boolean),
    popularity: asNumber(r.popularity) ?? 0,
    rating: asNumber(r.rating),
    ratingCount: asNumber(r.rating_count) ?? 0,
    testsList,
    testsCount: testsList.length,
    preparation: lang ? lang.split('\n').filter(Boolean) : [],
    fastingRequired: Boolean(r.fasting_required),
    fastingKnown: typeof r.fasting_required === 'boolean',
    fastingHours: asNumber(r.fasting_hours),
    turnaroundHours: asNumber(r.turnaround_hours),
    homeVisit: Boolean(r.home_visit_supported ?? r.homeAvailable),
    facilityVisit: Boolean(r.facility_visit_supported),
    portable: r.portable_ultrasound === true,
    isPopular: (asNumber(r.popularity) ?? 0) >= 80,
    insurance: r.insurance_availability === true,
    selfPay: r.cash_availability !== false,
    offer: offerSummaryOf(r),
    offers: offersOf(r),
  };
}

/** True when at least one service in the list can be booked on insurance (`insurance_availability: true`). */
export const insuranceOffered = (items: readonly CatalogItem[]): boolean => items.some((x) => x.insurance);

/** The list inside a response: the array itself, or the `data` of an envelope; [] when it is neither. */
export function rowsOf(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && Array.isArray((res as Raw).data)) return (res as Raw).data as unknown[];
  return [];
}

/** The object inside a response: the envelope's `data`, or the object itself; null when it is neither. */
export function recordOf(res: unknown): Raw | null {
  if (!res || typeof res !== 'object' || Array.isArray(res)) return null;
  const inner = (res as Raw).data;
  return inner && typeof inner === 'object' && !Array.isArray(inner) ? (inner as Raw) : (res as Raw);
}

export function normalizeLabList(rows: unknown): CatalogItem[] {
  const out: CatalogItem[] = [];
  for (const row of rowsOf(rows)) {
    const item = normalizeLabService(row);
    if (item) out.push(item);
  }
  return out;
}

export interface LabProvider {
  id: string;
  name: string;
  rating: number | null;
  /** The distance as the server wrote it (a number or a text); null when it sent none. */
  distance: string | number | null;
  branches: number | null;
  address: string;
  description: string;
  lat: number | null;
  lng: number | null;
  homeVisit: boolean;
  /** The lab's own total for the requested tests (GET /labs/compatible-providers `price`); null when it sent none. */
  price: number | null;
}

/** A lab or radiology centre of `/providers`, `/labs/compatible-providers` or `/radiology/compatible-providers`. */
export function normalizeProvider(raw: unknown): LabProvider | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const id = asText(r.id ?? r._id);
  if (!id) return null;
  return {
    id,
    name: asText(pickDbField(r, 'name') ?? r.name ?? r.business_name),
    rating: asNumber(r.rating ?? r.rating_avg),
    distance: typeof r.distance === 'number' || typeof r.distance === 'string' ? r.distance : null,
    branches: asNumber(r.branches),
    address: asText(r.address),
    description: asText(r.description),
    lat: asNumber(r.lat),
    lng: asNumber(r.lng),
    homeVisit: Boolean(r.homeVisitAvailable ?? r.providesHome ?? r.home_visit_enabled),
    price: (() => { const n = asNumber(r.price); return n !== null && n > 0 ? n : null; })(),
  };
}

export function normalizeProviders(rows: unknown): LabProvider[] {
  const out: LabProvider[] = [];
  for (const row of rowsOf(rows)) {
    const p = normalizeProvider(row);
    if (p) out.push(p);
  }
  return out;
}
