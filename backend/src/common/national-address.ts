/**
 * 19.7 — the Saudi National Address (Saudi Post / SPL) short address: four letters and four digits, e.g. RRRD2929.
 * Pure helpers; the lookup itself is `NationalAddressService`.
 */
const SHORT_ADDRESS = /^[A-Z]{4}\d{4}$/;

/** `rrrd 2929`, `RRRD-2929` → `RRRD2929`; null when it is not a short address. */
export function normalizeShortAddress(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.normalize('NFKC').replace(/[\s-]+/g, '').toUpperCase();
  return SHORT_ADDRESS.test(code) ? code : null;
}

export type NationalAddress = {
  short_address: string;
  building_number?: string;
  street?: string;
  district?: string;
  city?: string;
  region?: string;
  post_code?: string;
  additional_number?: string;
  lat?: number;
  lng?: number;
};

const pick = (o: any, ...keys: string[]): unknown => {
  for (const k of keys) {
    const hit = Object.keys(o || {}).find((x) => x.toLowerCase() === k.toLowerCase());
    if (hit !== undefined && o[hit] !== null && o[hit] !== undefined && o[hit] !== '') return o[hit];
  }
  return undefined;
};
const text = (v: unknown, max = 160): string | undefined => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) || undefined : undefined);
const coord = (v: unknown, lo: number, hi: number): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined;
};

/**
 * The first address in an SPL answer: `{ Addresses: [ { BuildingNumber, Street, District, City, PostCode,
 * AdditionalNumber, RegionName, Latitude, Longitude } ] }` (a bare object or `{ address: {...} }` is read the same way).
 * Returns null when the answer holds no address.
 */
export function parseNationalAddress(body: unknown, shortAddress: string): NationalAddress | null {
  const root: any = body && typeof body === 'object' ? body : null;
  if (!root) return null;
  const list = pick(root, 'Addresses', 'addresses');
  const one: any = Array.isArray(list) ? list[0] : pick(root, 'address') ?? root;
  if (!one || typeof one !== 'object') return null;
  const out: NationalAddress = {
    short_address: shortAddress,
    building_number: text(pick(one, 'BuildingNumber', 'building_number'), 8),
    street: text(pick(one, 'Street', 'street')),
    district: text(pick(one, 'District', 'district')),
    city: text(pick(one, 'City', 'city')),
    region: text(pick(one, 'RegionName', 'Region', 'region')),
    post_code: text(pick(one, 'PostCode', 'ZipCode', 'post_code'), 8),
    additional_number: text(pick(one, 'AdditionalNumber', 'additional_number'), 8),
    lat: coord(pick(one, 'Latitude', 'lat', 'latitude'), -90, 90),
    lng: coord(pick(one, 'Longitude', 'lng', 'lon', 'longitude'), -180, 180),
  };
  // An answer with none of the address parts is "not found", not an empty address.
  return out.street || out.city || out.district || out.post_code || out.lat !== undefined ? out : null;
}
