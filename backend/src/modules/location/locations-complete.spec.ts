/**
 * Completing the locations (owner decision 2026-10-26): cities of OpenStreetMap that the seed lacks are added with both names, their macro
 * region and their centre, and get their districts by boundary. REAL Overpass samples (saved 2026-10-25) feed the discovery.
 */
import * as fs from 'fs';
import * as path from 'path';
import { SAUDI_LOCATIONS_SEED } from './seeds/saudi-locations.data';
import { MACRO_REGION_OF_ISO, REGIONS, regionToRows } from '../../../scripts/geo/fetch-osm-districts-region';
import { buildBoundaries, discoverNewCities, slugOf, type OsmAny } from '../../../scripts/geo/district-assign';
import { mergeParts } from '../../../scripts/geo/merge-districts-parts';
import { validateExtract, validateNewCities } from '../../../scripts/geo/validate-districts-extract';
import { planImport, type ExistingRow } from './districts-plan';

const fixture = (name: string): OsmAny[] => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8')).elements;
const seedCities = SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'city');
const seedCodes = new Set(SAUDI_LOCATIONS_SEED.map((l) => l.code));
const riyadh = fixture('overpass-riyadh-towns.json');
const hood = (id: number, ar: string, en: string, lat: number, lon: number): OsmAny => ({ type: 'node', id, lat, lon, tags: { place: 'suburb', 'name:ar': ar, 'name:en': en } });

describe('the macro region of each ISO region', () => {
  it('covers every region the extract fetches, and each value is a region of the seed', () => {
    const regions = new Set(SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'region').map((l) => l.code));
    for (const r of REGIONS) expect(regions.has(MACRO_REGION_OF_ISO[r.iso])).toBe(true);
  });
});

describe('discoverNewCities (real Riyadh and Makkah samples)', () => {
  it('finds towns and cities the seed does not have, each with both names, a point and a fresh unique code', () => {
    const { boundaries } = buildBoundaries(riyadh);
    const r = discoverNewCities(riyadh, boundaries, seedCities, 'SA-01', seedCodes);
    const byCode = new Map(r.found.map((c) => [c.code, c]));
    expect(byCode.get('sa-ad-dilam')).toMatchObject({ name_ar: 'الدلم', name_en: 'Ad Dilam', rank: 'town', lat: 23.996944, lng: 47.165, source: 'osm:node/1236705168' });
    expect(byCode.has('sa-al-quwayiyah')).toBe(true);
    expect(r.found.length).toBeGreaterThan(20);
    for (const c of r.found) {
      expect(c.code).toMatch(/^sa-[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(seedCodes.has(c.code)).toBe(false);
      expect(c.name_ar && c.name_en).toBeTruthy();
    }
    expect(new Set(r.found.map((c) => c.code)).size).toBe(r.found.length);
  });

  it('never re-adds a city the seed already has (by Arabic or English name)', () => {
    const { boundaries } = buildBoundaries(riyadh);
    const names = discoverNewCities(riyadh, boundaries, seedCities, 'SA-01', seedCodes).found.map((c) => c.name_en.toLowerCase());
    for (const known of ['riyadh', 'diriyah', 'al kharj', 'shaqra']) expect(names).not.toContain(known);
  });

  it('a taken slug gets the region number appended; a place with no English name is listed, not transliterated', () => {
    const { boundaries } = buildBoundaries(riyadh);
    const r = discoverNewCities(riyadh, boundaries, seedCities, 'SA-01', new Set([...seedCodes, 'sa-ad-dilam']));
    expect(r.found.some((c) => c.code === 'sa-ad-dilam-01' && c.name_en === 'Ad Dilam')).toBe(true);
    expect(r.skipped_no_english_name.length).toBeGreaterThan(0);
    expect(r.found.every((c) => c.name_en !== c.name_ar)).toBe(true);
  });

  it('slugOf makes ASCII codes', () => {
    expect(slugOf("Ad Dil`am Al-Jadid")).toBe('ad-dil-am-al-jadid');
    expect(slugOf('Mḥayil')).toBe('mhayil');
  });
});

describe('regionToRows with a region number', () => {
  it('districts near a new city are assigned to it (by nearest centre) and the new city is returned with its macro region', () => {
    const els = [...riyadh, hood(9001, 'حي النزهة', 'An Nuzha', 23.9975, 47.1655)];
    const r = regionToRows(els, seedCities, 25, 'SA-01', seedCodes);
    const dilam = r.new_cities.find((c) => c.code === 'sa-ad-dilam');
    expect(dilam).toMatchObject({ region_code: 'sa-central-region', name_ar: 'الدلم' });
    expect(r.cities.find((c) => c.code === 'sa-ad-dilam')).toBeTruthy();
    expect(r.rows.find((d) => d.source === 'osm:node/9001')).toMatchObject({ city_code: 'sa-ad-dilam', name_en: 'An Nuzha' });
  });
  it('without a region number nothing is discovered (the old behaviour)', () => {
    expect(regionToRows(riyadh, seedCities, 25).new_cities).toEqual([]);
  });
});

describe('validateNewCities and the whole validation', () => {
  const ok = { code: 'sa-ad-dilam', name_ar: 'الدلم', name_en: "Ad Dil`am", region_code: 'sa-central-region', lat: 23.99, lng: 47.16, source: 'osm:node/1' };
  it('keeps a good city (English name cleaned) and rejects each broken kind by reason', () => {
    const r = validateNewCities([ok, { ...ok, code: 'sa-riyadh' }, { ...ok, code: 'sa-x1', name_en: '' }, { ...ok, code: 'sa-x2', region_code: 'sa' }, { ...ok, code: 'sa-x3', lat: 50 }, { ...ok, code: 'sa-x4', source: '' }, { ...ok, code: 'Bad Code' }, { ...ok, code: 'sa-ad-dilam-2' }], seedCodes);
    expect(r.kept.map((c) => c.code)).toEqual(['sa-ad-dilam']);
    expect(r.kept[0].name_en).toBe('Ad Dilam');
    expect(r.rejected).toEqual({ bad_code: 2, missing_name: 1, unknown_region: 1, outside_kingdom: 1, no_source: 1, duplicate: 1 });
  });
  it('districts of a kept new city survive; those of a rejected one are "unknown_city"', () => {
    const d = (city: string) => ({ city_code: city, name_ar: 'حي أ', name_en: 'A', lat: 24, lng: 47, source: 'osm:node/2' });
    const res = validateExtract({ new_cities: [ok, { ...ok, code: 'sa-bad', lat: 99 }], districts: [d('sa-ad-dilam'), d('sa-bad')] }, new Set(['sa-riyadh']), new Set(['sa-riyadh']));
    expect(res.kept.map((k) => k.city_code)).toEqual(['sa-ad-dilam']);
    expect(res.rejected.unknown_city).toBe(1);
  });
});

describe('planImport with new cities', () => {
  const existing: ExistingRow[] = [
    { code: 'sa-central-region', name_ar: 'المنطقة الوسطى', name_en: 'Central Region', type: 'region' },
    { code: 'sa-riyadh', name_ar: 'الرياض', name_en: 'Riyadh', type: 'city', parent_code: 'sa-central-region' },
  ];
  const nc = { code: 'sa-ad-dilam', name_ar: 'الدلم', name_en: 'Ad Dilam', region_code: 'sa-central-region', lat: 23.99, lng: 47.16, source: 'osm:node/1' };
  it('inserts the city and numbers its districts from 001', () => {
    const plan = planImport(existing, { new_cities: [nc], districts: [{ city_code: 'sa-ad-dilam', name_ar: 'النزهة', name_en: 'An Nuzha', lat: 24, lng: 47.1, source: 'osm:node/2' }] });
    expect(plan.newCities.map((c) => c.code)).toEqual(['sa-ad-dilam']);
    expect(plan.inserts.map((i) => i.code)).toEqual(['sa-ad-dilam-001']);
    expect(plan.rejected).toEqual([]);
  });
  it('refuses a new city with an unknown region, a taken code or a bad point, and its districts with it', () => {
    const plan = planImport(existing, { new_cities: [{ ...nc, region_code: 'sa-nowhere' }, { ...nc, code: 'sa-riyadh' }, { ...nc, code: 'sa-x', lat: 1 }], districts: [{ city_code: 'sa-x', name_ar: 'ح', name_en: 'H', lat: 24, lng: 47, source: 's' }] });
    expect(plan.newCities).toEqual([]);
    expect(plan.rejected.map((r) => r.reason)).toEqual(['unknown_region', 'new_city_code', 'invalid_point', 'unknown_city']);
  });
});

describe('mergeParts with new cities', () => {
  it('keeps a new city once, and drops one that two regions both produced', () => {
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'parts-'));
    const nc = (code: string) => ({ code, name_ar: 'أ', name_en: 'A', region_code: 'sa-central-region', lat: 24, lng: 47, source: 'osm:node/1' });
    fs.writeFileSync(path.join(dir, 'part-SA-01.json'), JSON.stringify({ cities: [], new_cities: [nc('sa-a'), nc('sa-clash')], districts: [] }));
    fs.writeFileSync(path.join(dir, 'part-SA-02.json'), JSON.stringify({ cities: [], new_cities: [nc('sa-clash')], districts: [] }));
    const { merged, report } = mergeParts(dir);
    expect(merged.new_cities.map((c) => c.code)).toEqual(['sa-a']);
    expect((report.assignment as { new_cities: unknown }).new_cities).toEqual({ found: 1, conflicting_codes: ['sa-clash'] });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('a city two regions disagree on takes the centre found in a region of its own macro region', () => {
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'parts-'));
    const c = (lat: number) => ({ code: 'sa-arar', lat, lng: 41, source: 'osm:node/1' });
    fs.writeFileSync(path.join(dir, 'part-SA-08.json'), JSON.stringify({ cities: [c(30.9)], districts: [] })); // Northern Borders: the seed's Arar is in the north
    fs.writeFileSync(path.join(dir, 'part-SA-03.json'), JSON.stringify({ cities: [c(25.9)], districts: [] })); // a homonym in Madinah (west)
    const { merged, report } = mergeParts(dir);
    expect(merged.cities.find((x) => x.code === 'sa-arar')?.lat).toBe(30.9);
    expect((report.assignment as { conflicting_centres: string[] }).conflicting_centres).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
