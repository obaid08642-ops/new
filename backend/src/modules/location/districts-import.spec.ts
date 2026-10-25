import { normalizeDistrictName, planImport, type ExistingRow, type Extract } from '../../../scripts/migrations/2026-10-districts-import';

const existing: ExistingRow[] = [
  { code: 'sa-riyadh', name_ar: 'الرياض', name_en: 'Riyadh', type: 'city' },
  { code: 'sa-jeddah', name_ar: 'جدة', name_en: 'Jeddah', type: 'city' },
  { code: 'sa-riyadh-001', name_ar: 'حي الملقا', name_en: 'Al Malqa District', type: 'district', parent_code: 'sa-riyadh' },
  { code: 'sa-riyadh-002', name_ar: 'حي الياسمين', name_en: 'Al Yasmin District', type: 'district', parent_code: 'sa-riyadh', coordinates: { lat: 24.82, lng: 46.65 } },
];
const d = (over: Record<string, unknown>) => ({ city_code: 'sa-riyadh', name_ar: 'العليا', name_en: 'Al Olaya', lat: 24.69, lng: 46.68, source: 'osm:place=suburb', ...over });

describe('district name matching', () => {
  it('ignores حي / District, ال / Al, diacritics and case', () => {
    expect(normalizeDistrictName('حي الملقا')).toBe(normalizeDistrictName('الملقا'));
    expect(normalizeDistrictName('Al Malqa District')).toBe(normalizeDistrictName('malqa'));
    expect(normalizeDistrictName('An Narjis District')).toBe(normalizeDistrictName('Narjis'));
    expect(normalizeDistrictName('حيّ النَّرجس')).toBe(normalizeDistrictName('نرجس'));
    expect(normalizeDistrictName('')).toBe('');
  });
});

describe('planImport', () => {
  it('fills the centroid of a district that exists without one, keeps one that has it, inserts a new one under the next code', () => {
    const extract: Extract = { districts: [d({ name_ar: 'الملقا', name_en: 'Malqa', lat: 24.81, lng: 46.62 }), d({ name_ar: 'الياسمين', name_en: 'Yasmin', lat: 24.9, lng: 46.7 }), d({})] };
    const plan = planImport(existing, extract);
    expect(plan.fills).toEqual([{ code: 'sa-riyadh-001', lat: 24.81, lng: 46.62, source: 'osm:place=suburb' }]);
    expect(plan.inserts).toEqual([{ code: 'sa-riyadh-003', city_code: 'sa-riyadh', name_ar: 'العليا', name_en: 'Al Olaya', lat: 24.69, lng: 46.68, source: 'osm:place=suburb' }]);
    const riyadh = plan.perCity.find((c) => c.city === 'sa-riyadh')!;
    expect(riyadh).toMatchObject({ existing: 2, extract: 3, matched: 2, centroid_fills: 1, already_has_centroid: 1, new: 1, rejected: 0 });
    expect(plan.perCity.find((c) => c.city === 'sa-jeddah')).toMatchObject({ existing: 0, extract: 0, new: 0 });
  });

  it('records the source of every row it writes, and rejects a row without one', () => {
    const plan = planImport(existing, { districts: [d({ source: '' }), d({ name_ar: 'النرجس', name_en: 'Narjis', source: 'spl:district-list-2026' })] });
    expect(plan.rejected).toEqual([{ city_code: 'sa-riyadh', name: 'Al Olaya', reason: 'source_required' }]);
    expect(plan.inserts[0].source).toBe('spl:district-list-2026');
  });

  it.each([
    [{ lat: 10, lng: 46 }, 'invalid_point'],
    [{ lat: 24, lng: 70 }, 'invalid_point'],
    [{ name_en: '' }, 'name_required'],
    [{ city_code: 'sa-nowhere' }, 'unknown_city'],
  ])('rejects %p as %s and writes nothing for it', (over, reason) => {
    const plan = planImport(existing, { districts: [d(over)] });
    expect(plan.rejected.map((r) => r.reason)).toEqual([reason]);
    expect(plan.inserts).toEqual([]);
    expect(plan.fills).toEqual([]);
  });

  it('drops a repeated district inside the extract and does not insert the same name twice', () => {
    const plan = planImport(existing, { districts: [d({}), d({ name_ar: 'حي العليا', name_en: 'Olaya District' })] });
    expect(plan.inserts).toHaveLength(1);
    expect(plan.rejected.map((r) => r.reason)).toEqual(['duplicate_in_extract']);
  });

  it('is idempotent: planning the same extract again against the result adds nothing', () => {
    const extract: Extract = { districts: [d({}), d({ name_ar: 'الملقا', name_en: 'Malqa' })] };
    const first = planImport(existing, extract);
    const after: ExistingRow[] = existing.map((r) => (first.fills.find((f) => f.code === r.code) ? { ...r, coordinates: { lat: 1, lng: 1 } } : r)).concat(first.inserts.map((i) => ({ code: i.code, name_ar: i.name_ar, name_en: i.name_en, type: 'district', parent_code: i.city_code, coordinates: { lat: i.lat, lng: i.lng } })));
    const second = planImport(after, extract);
    expect(second.fills).toEqual([]);
    expect(second.inserts).toEqual([]);
  });

  it('fills a city centroid only while it has none, and only for a known city', () => {
    const plan = planImport([...existing.slice(1), { ...existing[0], coordinates: { lat: 24.7, lng: 46.7 } }], { cities: [{ code: 'sa-riyadh', lat: 1, lng: 1, source: 'x' }, { code: 'sa-jeddah', lat: 21.54, lng: 39.17, source: 'osm:place=city' }, { code: 'sa-ghost', lat: 21, lng: 39, source: 'x' }], districts: [] });
    expect(plan.cityFills).toEqual([{ code: 'sa-jeddah', lat: 21.54, lng: 39.17, source: 'osm:place=city' }]);
  });
});

import { overpassQuery, overpassToRows } from '../../../scripts/geo/fetch-osm-districts';

describe('OSM extract builder', () => {
  const el = (id: number, tags: Record<string, string>, extra: Record<string, unknown> = {}) => ({ type: 'node' as const, id, tags, lat: 24.7, lon: 46.7, ...extra });
  it('keeps a place only with both names and a point, and records the OSM id as the source', () => {
    const { rows, skipped } = overpassToRows('sa-riyadh', [
      el(1, { 'name:ar': 'العليا', 'name:en': 'Al Olaya' }),
      el(2, { 'name:ar': 'الملقا' }),
      { type: 'way', id: 3, tags: { 'name:ar': 'النرجس', 'name:en': 'An Narjis' }, center: { lat: 24.9, lon: 46.7 } },
      { type: 'relation', id: 4, tags: { 'name:ar': 'بلا نقطة', 'name:en': 'No Point' } },
      el(5, { 'name:ar': 'العليا', 'name:en': 'Al Olaya' }),
    ]);
    expect(rows).toEqual([
      { city_code: 'sa-riyadh', name_ar: 'العليا', name_en: 'Al Olaya', lat: 24.7, lng: 46.7, source: 'osm:node/1' },
      { city_code: 'sa-riyadh', name_ar: 'النرجس', name_en: 'An Narjis', lat: 24.9, lng: 46.7, source: 'osm:way/3' },
    ]);
    expect(skipped).toEqual({ no_ar_or_en_name: 1, no_point: 1, duplicate: 1 });
  });
  it('builds a query that cannot be broken out of by a city name', () => {
    const q = overpassQuery('الرياض"; drop', 'Riyadh\\');
    expect(q).toContain('["name:ar"="الرياض; drop"]');
    expect(q).toContain('["name:en"="Riyadh"]');
    expect(q).toContain('out center tags;');
  });
});
