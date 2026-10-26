/**
 * The pure part of the districts-by-region extract: which OF OUR cities a place of OpenStreetMap belongs to.
 *
 *  1. City centres. The seed cities carry no coordinates, so each one gets a centre from the region's own OSM `place=city|town|village`
 *     (matched by name; city beats town beats village; two places of the same rank that are far apart are AMBIGUOUS and give no centre,
 *     because guessing one moved Makkah's districts to Al Jumum and gave Bahrah a centre 150 km from Bahrah), else from the middle of
 *     the city's own boundary. Which cities were filled, from what, and which could not be is reported.
 *  2. Assignment. A district goes to the city whose administrative boundary (admin_level 6–8) CONTAINS its point (the smallest one that
 *     matches a city of ours); with no such boundary it goes to the nearest city centre within `maxKm`; farther is rejected with a reason.
 *
 * No network, no database: the fetch script feeds it the Overpass answers.
 */
import { normalizeDistrictName } from '../../src/modules/location/districts-plan';

export interface Pt { lat: number; lng: number }
export interface OsmTagged { type: 'node' | 'way' | 'relation'; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }
export interface OsmMember { type: string; role?: string; geometry?: Array<{ lat: number; lon: number }> }
export interface OsmRelation extends OsmTagged { type: 'relation'; members?: OsmMember[] }
export type OsmAny = OsmTagged | OsmRelation;
export interface SeedCity { code: string; name_ar: string; name_en: string; aliases?: string[] }

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;
export function distanceM(a: Pt, b: Pt): number {
  const dLat = rad(b.lat - a.lat); const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const pointOf = (e: OsmTagged): Pt | null => {
  const lat = e.lat ?? e.center?.lat; const lng = e.lon ?? e.center?.lon;
  return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
};

// ── Names ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Words that say what kind of area a name is, not which one; dropped before comparing a boundary or place name with a city of ours. */
const NOISE = new Set(
  ['محافظة', 'أمانة', 'امانة', 'بلدية', 'مدينة', 'منطقة', 'المكرمة', 'المنورة', 'governorate', 'municipality', 'province', 'city', 'amanah', 'of', 'region', 'almukarramah', 'almunawwarah'].map((w) =>
    normalizeDistrictName(w),
  ),
);
/** A few names OSM spells differently from our seed. Add here when a run reports a city without a centre. */
export const CITY_ALIASES: Record<string, string[]> = {
  'sa-makkah': ['Mecca', 'Makkah Al Mukarramah'],
  'sa-madinah': ['Medina', 'Al Madinah Al Munawwarah'],
};

/** One comparable form of a city or boundary name. */
export function cityKey(raw: string): string {
  const kept = String(raw || '').split(/\s+/).filter((t) => t && !NOISE.has(normalizeDistrictName(t)));
  return normalizeDistrictName(kept.join(' '));
}
const namesOf = (e: OsmTagged): string[] => [e.tags?.['name:ar'], e.tags?.['name:en'], e.tags?.name].filter((v): v is string => !!v);
const keysOf = (names: string[]) => new Set(names.map(cityKey).filter(Boolean));
const seedKeys = (c: SeedCity) => keysOf([c.name_ar, c.name_en, ...(c.aliases ?? []), ...(CITY_ALIASES[c.code] ?? [])]);

// ── Boundaries ───────────────────────────────────────────────────────────────────────────────────────────────────────
type Ring = Pt[];
const same = (a: Pt, b: Pt) => a.lat === b.lat && a.lng === b.lng;

/**
 * Joins ways end to end into closed rings. A way may join either end of the chain being built and may run in either direction: the ways
 * of a real boundary relation come in any order and any direction (the first way's START is often the second one's END), so extending only
 * the end of the chain never closed a ring. A chain that never closes is dropped (the caller counts the relation as unclosed).
 */
export function stitchRings(segments: Pt[][]): Ring[] {
  const left = segments.filter((s) => s.length >= 2).map((s) => [...s]);
  const rings: Ring[] = [];
  const closed = (r: Ring) => r.length > 3 && same(r[0], r[r.length - 1]);
  while (left.length) {
    let ring = left.shift() as Ring;
    let progressed = true;
    while (progressed && !closed(ring)) {
      progressed = false;
      const head = ring[0]; const tail = ring[ring.length - 1];
      for (let i = 0; i < left.length; i++) {
        const s = left[i]; const first = s[0]; const last = s[s.length - 1];
        if (same(first, tail)) ring = [...ring, ...s.slice(1)];
        else if (same(last, tail)) ring = [...ring, ...[...s].reverse().slice(1)];
        else if (same(last, head)) ring = [...s.slice(0, -1), ...ring];
        else if (same(first, head)) ring = [...[...s].reverse().slice(0, -1), ...ring];
        else continue;
        left.splice(i, 1); progressed = true; break;
      }
    }
    if (closed(ring)) rings.push(ring);
  }
  return rings;
}

/** Even-odd rule over every ring of the relation, so inner rings (holes) subtract themselves. */
export function pointInRings(p: Pt, rings: Ring[]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]; const b = ring[j];
      if (a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) inside = !inside;
    }
  }
  return inside;
}

export interface Boundary { id: number; names: string[]; keys: Set<string>; level: number; rings: Ring[]; areaKey: number; centre: Pt }

export function buildBoundaries(elements: OsmAny[]): { boundaries: Boundary[]; unclosed: number } {
  const boundaries: Boundary[] = [];
  let unclosed = 0;
  for (const e of elements) {
    if (e.type !== 'relation' || e.tags?.boundary !== 'administrative') continue;
    const level = Number(e.tags?.admin_level);
    if (!(level >= 6 && level <= 8)) continue;
    const segments = ((e as OsmRelation).members ?? []).filter((m) => m.type === 'way' && m.geometry?.length).map((m) => (m.geometry as Array<{ lat: number; lon: number }>).map((g) => ({ lat: g.lat, lng: g.lon })));
    const rings = stitchRings(segments);
    if (!rings.length) { unclosed += 1; continue; }
    const pts = rings.flat();
    const lats = pts.map((p) => p.lat); const lngs = pts.map((p) => p.lng);
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats); const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
    const names = namesOf(e);
    boundaries.push({ id: e.id, names, keys: keysOf(names), level, rings, areaKey: (maxLat - minLat) * (maxLng - minLng), centre: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 } });
  }
  return { boundaries, unclosed };
}

// ── City centres ───────────────────────────────────────────────────────────────────────────────────────────────────
export interface Centre { lat: number; lng: number; source: string; from: 'place' | 'boundary' }
export interface CentreResult {
  centres: Map<string, Centre>;
  /** seed city → the boundaries (admin_level 6–8) that carry its name, smallest first */
  boundaryOf: Map<string, Boundary[]>;
  ambiguous: string[];
  missing: string[];
}
const RANK: Record<string, number> = { city: 3, town: 2, village: 1 };

export function resolveCentres(places: OsmAny[], boundaries: Boundary[], cities: SeedCity[]): CentreResult {
  const centres = new Map<string, Centre>();
  const boundaryOf = new Map<string, Boundary[]>();
  const ambiguous: string[] = []; const missing: string[] = [];
  const nodes = places.filter((e) => e.tags?.place && RANK[e.tags.place] && pointOf(e));
  for (const c of cities) {
    const keys = seedKeys(c);
    const polys = boundaries.filter((b) => [...b.keys].some((k) => keys.has(k))).sort((a, b) => a.areaKey - b.areaKey);
    if (polys.length) boundaryOf.set(c.code, polys);
    const named = nodes.filter((e) => [...keysOf(namesOf(e))].some((k) => keys.has(k)));
    let centre: Centre | null = null;
    let isAmbiguous = false;
    if (named.length) {
      const best = Math.max(...named.map((e) => RANK[e.tags!.place]));
      let top = named.filter((e) => RANK[e.tags!.place] === best);
      const inside = polys.length ? top.filter((e) => pointInRings(pointOf(e) as Pt, polys[0].rings)) : [];
      if (inside.length) top = inside;
      if (top.length > 1) {
        const pop = (e: OsmTagged) => Number(e.tags?.population) || 0;
        const maxPop = Math.max(...top.map(pop));
        if (maxPop > 0) top = top.filter((e) => pop(e) === maxPop);
      }
      const p0 = pointOf(top[0]) as Pt;
      if (top.every((e) => distanceM(p0, pointOf(e) as Pt) < 3000)) centre = { ...p0, source: `osm:${top[0].type}/${top[0].id}`, from: 'place' };
      else isAmbiguous = true;
    }
    if (!centre && polys.length) centre = { ...polys[0].centre, source: `osm:relation/${polys[0].id}`, from: 'boundary' };
    if (centre) centres.set(c.code, centre);
    else missing.push(c.code);
    if (isAmbiguous) ambiguous.push(c.code);
  }
  return { centres, boundaryOf, ambiguous, missing };
}

// ── Assignment ───────────────────────────────────────────────────────────────────────────────────────────────────────
export type AssignedBy = 'boundary' | 'nearest';
export type AssignOutcome = { city: string; by: AssignedBy } | { rejected: 'too_far' | 'no_city_centre' };

export function assignPoint(p: Pt, res: CentreResult, maxKm: number): AssignOutcome {
  let best: { city: string; area: number } | null = null;
  for (const [city, polys] of res.boundaryOf) {
    for (const b of polys) if ((!best || b.areaKey < best.area) && pointInRings(p, b.rings)) best = { city, area: b.areaKey };
  }
  if (best) return { city: best.city, by: 'boundary' };
  if (!res.centres.size) return { rejected: 'no_city_centre' };
  let near: { city: string; m: number } | null = null;
  for (const [city, c] of res.centres) {
    const m = distanceM(p, c);
    if (!near || m < near.m) near = { city, m };
  }
  return near && near.m <= maxKm * 1000 ? { city: near.city, by: 'nearest' } : { rejected: 'too_far' };
}

// ── Cities our seed does not have ────────────────────────────────────────────────────────────────────────────────────
/** A city or governorate seat found in OpenStreetMap that no seed city matches; it is added with both names, its region and its centre. */
export interface NewCity { code: string; name_ar: string; name_en: string; iso: string; lat: number; lng: number; source: string; rank: 'city' | 'town' | 'seat' }
export interface DiscoverResult { found: NewCity[]; skipped_no_english_name: string[]; ambiguous: string[] }

const ARABIC = /[\u0600-\u06FF]/;
/** English names from OSM carry transliteration marks and sometimes Arabic diacritics; none belongs in a name_en. */
const latinName = (raw: string) => raw.replace(/[`´ʿʾʻʼ]/g, '').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/\s+/g, ' ').trim();
/** «محافظة X» / "X Governorate" → X: the kind of area is not part of the city's name. */
const stripKind = (v: string) => v.replace(/^\s*(محافظة|مدينة|بلدية)\s+/, '').replace(/\s+(governorate|municipality)\s*$/i, '').trim();
export const slugOf = (en: string) => en.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Every city/town of the region (and every village that is the seat of a governorate) that none of our cities matches by name. Both names
 * are required (nothing is transliterated); a name that two places of the same rank share far apart is ambiguous and skipped. `takenCodes`
 * are the codes already used, so a new code never collides (the region number is appended when the plain slug is taken).
 */
export function discoverNewCities(places: OsmAny[], boundaries: Boundary[], known: SeedCity[], iso: string, takenCodes: Set<string>): DiscoverResult {
  const knownKeys = new Set<string>();
  for (const c of known) for (const k of seedKeys(c)) knownKeys.add(k);
  const governorates = boundaries.filter((b) => b.level === 6);
  const governorateKeys = new Set(governorates.flatMap((b) => [...b.keys]));
  const candidates: NewCity[] = [];
  const noEnglish = new Set<string>();
  const ambiguous: string[] = [];

  const consider = (name_ar: string | undefined, name_en: string | undefined, p: Pt, source: string, rank: NewCity['rank']) => {
    const ar = name_ar ? stripKind(name_ar) : '';
    if (!ar || !ARABIC.test(ar)) return null;
    const en = name_en ? latinName(stripKind(name_en)) : '';
    if (!en) { noEnglish.add(ar); return null; }
    const keys = [cityKey(ar), cityKey(en)].filter(Boolean);
    if (!keys.length || keys.some((k) => knownKeys.has(k))) return null;
    return { name_ar: ar, name_en: en, key: keys[0], p, source, rank };
  };

  type Cand = NonNullable<ReturnType<typeof consider>>;
  const found: Cand[] = [];
  for (const e of places) {
    const place = e.tags?.place; const p = pointOf(e);
    if (e.type === 'relation' || !place || !p) continue;
    const key = cityKey(e.tags?.['name:ar'] ?? e.tags?.name ?? '');
    const seat = place === 'village' && governorateKeys.has(key);
    if (place !== 'city' && place !== 'town' && !seat) continue;
    const arabicName = e.tags?.['name:ar'] ?? (ARABIC.test(e.tags?.name ?? '') ? e.tags?.name : undefined);
    const c = consider(arabicName, e.tags?.['name:en'], p, `osm:${e.type}/${e.id}`, seat ? 'seat' : (place as 'city' | 'town'));
    if (c) found.push(c);
  }
  // a governorate whose seat is not a place node of its own: the middle of its boundary
  for (const b of governorates) {
    const ar = b.names.find((n) => ARABIC.test(n)); const en = b.names.find((n) => !ARABIC.test(n));
    const c = consider(ar, en, b.centre, `osm:relation/${b.id}`, 'seat');
    if (c) found.push(c);
  }

  const byKey = new Map<string, Cand[]>();
  for (const c of found) byKey.set(c.key, [...(byKey.get(c.key) ?? []), c]);
  const rankOf = (c: Cand) => (c.rank === 'city' ? 3 : c.rank === 'town' ? 2 : 1);
  const used = new Set(takenCodes);
  for (const [, list] of [...byKey].sort(([a], [b]) => a.localeCompare(b))) {
    const best = Math.max(...list.map(rankOf));
    // a place node beats the middle of a boundary of the same name
    const top = list.filter((c) => rankOf(c) === best && (c.source.startsWith('osm:relation/') ? !list.some((o) => !o.source.startsWith('osm:relation/')) : true));
    if (!top.every((c) => distanceM(top[0].p, c.p) < 3000)) { ambiguous.push(top[0].name_en); continue; }
    const c = top[0];
    const base = `sa-${slugOf(c.name_en)}`;
    if (base === 'sa-') continue;
    let code = base;
    if (used.has(code)) code = `${base}-${iso.slice(3)}`;
    if (used.has(code)) continue;
    used.add(code);
    candidates.push({ code, name_ar: c.name_ar, name_en: c.name_en, iso, lat: c.p.lat, lng: c.p.lng, source: c.source, rank: c.rank });
  }
  return { found: candidates.sort((a, b) => a.code.localeCompare(b.code)), skipped_no_english_name: [...noEnglish].sort(), ambiguous: ambiguous.sort() };
}
