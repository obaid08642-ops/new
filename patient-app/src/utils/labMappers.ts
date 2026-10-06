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

type Raw = Record<string, unknown>;

export interface CatalogItem {
  id: string;
  name: string;
  desc: string;
  image: string | undefined;
  price: number | null;
  oldPrice: number | null;
  category: string;
  /** The names of the tests a package includes. */
  testsList: string[];
  testsCount: number;
  /** The preparation steps the server listed, in the language asked. */
  preparation: string[];
  fastingRequired: boolean;
  fastingHours: number | null;
  turnaroundHours: number | null;
  homeVisit: boolean;
  facilityVisit: boolean;
  isPopular: boolean;
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
    testsList,
    testsCount: testsList.length,
    preparation: lang ? lang.split('\n').filter(Boolean) : [],
    fastingRequired: Boolean(r.fasting_required),
    fastingHours: asNumber(r.fasting_hours),
    turnaroundHours: asNumber(r.turnaround_hours),
    homeVisit: Boolean(r.home_visit_supported ?? r.homeAvailable),
    facilityVisit: Boolean(r.facility_visit_supported),
    isPopular: (asNumber(r.popularity) ?? 0) >= 80,
  };
}

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
