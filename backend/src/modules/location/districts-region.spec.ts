import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { REGIONS, queryOverpass, regionBoundariesQuery, regionQuery, regionToRows } from '../../../scripts/geo/fetch-osm-districts-region';
import { buildBoundaries, cityKey, pointInRings, resolveCentres, stitchRings, type OsmAny } from '../../../scripts/geo/district-assign';
import { mergeParts, type Assignment } from '../../../scripts/geo/merge-districts-parts';
import { assignmentSummaryMarkdown, cleanEnglishName, validateExtract } from '../../../scripts/geo/validate-districts-extract';

const cities = [
  { code: 'sa-riyadh', name_ar: 'الرياض', name_en: 'Riyadh' },
  { code: 'sa-makkah', name_ar: 'مكة المكرمة', name_en: 'Makkah' },
  { code: 'sa-al-jumum', name_ar: 'الجموم', name_en: 'Al Jumum' },
  { code: 'sa-bahrah', name_ar: 'بحرة', name_en: 'Bahrah' },
  { code: 'sa-no-node', name_ar: 'مدينة بلا عقدة', name_en: 'Nowhere' },
];
const node = (id: number, tags: Record<string, string>, lat: number, lon: number): OsmAny => ({ type: 'node', id, lat, lon, tags });
const place = (kind: string, id: number, lat: number, lon: number, ar?: string, en?: string, extra: Record<string, string> = {}) =>
  node(id, { place: kind, ...(ar ? { 'name:ar': ar } : {}), ...(en ? { 'name:en': en } : {}), ...extra }, lat, lon);
/** A square boundary relation (one closed way, given as two halves so the stitching is exercised). */
const square = (id: number, level: number, ar: string, en: string, minLat: number, minLon: number, maxLat: number, maxLon: number): OsmAny => ({
  type: 'relation', id, tags: { boundary: 'administrative', admin_level: String(level), 'name:ar': ar, 'name:en': en },
  members: [
    { type: 'way', role: 'outer', geometry: [{ lat: minLat, lon: minLon }, { lat: minLat, lon: maxLon }, { lat: maxLat, lon: maxLon }] },
    { type: 'way', role: 'outer', geometry: [{ lat: minLat, lon: minLon }, { lat: maxLat, lon: minLon }, { lat: maxLat, lon: maxLon }] }, // reversed half
  ],
} as OsmAny);

describe('geometry', () => {
  it('stitches ways into a closed ring in either direction and drops a chain that never closes', () => {
    const a = { lat: 0, lng: 0 }; const b = { lat: 0, lng: 1 }; const c = { lat: 1, lng: 1 }; const d = { lat: 1, lng: 0 };
    expect(stitchRings([[a, b, c], [a, d, c]])).toHaveLength(1);
    expect(stitchRings([[a, b], [b, c]])).toHaveLength(0);
  });

  it('even-odd: a point in a hole is outside', () => {
    const outer = [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }, { lat: 10, lng: 10 }, { lat: 10, lng: 0 }, { lat: 0, lng: 0 }];
    const hole = [{ lat: 4, lng: 4 }, { lat: 4, lng: 6 }, { lat: 6, lng: 6 }, { lat: 6, lng: 4 }, { lat: 4, lng: 4 }];
    expect(pointInRings({ lat: 1, lng: 1 }, [outer, hole])).toBe(true);
    expect(pointInRings({ lat: 5, lng: 5 }, [outer, hole])).toBe(false);
    expect(pointInRings({ lat: 20, lng: 5 }, [outer, hole])).toBe(false);
  });

  it('compares city names without the words that only say what kind of area it is', () => {
    expect(cityKey('محافظة مكة المكرمة')).toBe(cityKey('مكة'));
    expect(cityKey('Jeddah Governorate')).toBe(cityKey('Jeddah'));
    expect(cityKey('أمانة محافظة جدة')).toBe(cityKey('جدة'));
  });
});

describe('city centres', () => {
  it('gives Makkah (no seed coordinates) a centre from its place node, matching the long Arabic name', () => {
    const r = resolveCentres([place('city', 1, 21.4225, 39.8262, 'مكة', 'Mecca')], [], cities);
    expect(r.centres.get('sa-makkah')).toMatchObject({ lat: 21.4225, lng: 39.8262, source: 'osm:node/1', from: 'place' });
  });

  it('a city beats a town beats a village of the same name', () => {
    const r = resolveCentres([place('village', 1, 19.9, 40.6, 'بحرة', 'Bahrah'), place('town', 2, 21.4, 39.45, 'بحرة', 'Bahrah')], [], cities);
    expect(r.centres.get('sa-bahrah')?.source).toBe('osm:node/2');
  });

  it('two far-apart places of the same rank are ambiguous: no centre, reported, not guessed', () => {
    const r = resolveCentres([place('village', 1, 19.9, 40.6, 'بحرة', 'Bahrah'), place('village', 2, 21.4, 39.45, 'بحرة', 'Bahrah')], [], cities);
    expect(r.centres.has('sa-bahrah')).toBe(false);
    expect(r.ambiguous).toContain('sa-bahrah');
    expect(r.missing).toContain('sa-bahrah');
  });

  it('prefers the homonym inside the city\'s own boundary, then the one with the larger population', () => {
    const { boundaries } = buildBoundaries([square(9, 8, 'بحرة', 'Bahrah', 21.3, 39.3, 21.5, 39.6)]);
    const inside = resolveCentres([place('village', 1, 19.9, 40.6, 'بحرة', 'Bahrah'), place('village', 2, 21.4, 39.45, 'بحرة', 'Bahrah')], boundaries, cities);
    expect(inside.centres.get('sa-bahrah')?.source).toBe('osm:node/2');
    const pop = resolveCentres([place('village', 1, 19.9, 40.6, 'بحرة', 'Bahrah', { population: '500' }), place('village', 2, 21.4, 39.45, 'بحرة', 'Bahrah', { population: '9000' })], [], cities);
    expect(pop.centres.get('sa-bahrah')?.source).toBe('osm:node/2');
  });

  it('falls back to the middle of the city boundary when there is no place node', () => {
    const { boundaries } = buildBoundaries([square(7, 6, 'محافظة الجموم', 'Al Jumum Governorate', 21.0, 39.5, 21.2, 39.7)]);
    const r = resolveCentres([], boundaries, cities);
    expect(r.centres.get('sa-al-jumum')).toMatchObject({ source: 'osm:relation/7', from: 'boundary' });
  });
});

describe('districts by region', () => {
  it('has the 13 regions and queries only for a valid ISO code', () => {
    expect(REGIONS).toHaveLength(13);
    expect(regionQuery('SA-01')).toContain('"ISO3166-2"="SA-01"');
    expect(regionBoundariesQuery('SA-02')).toContain('admin_level"~"^(6|7|8)$"');
    expect(() => regionQuery('SA-01"; drop')).toThrow();
    expect(() => regionBoundariesQuery('x')).toThrow();
  });

  it('Makkah\'s districts go to Makkah, not to the nearest town that has a centre (the 2751-district run)', () => {
    const els: OsmAny[] = [
      place('city', 1, 21.4225, 39.8262, 'مكة', 'Mecca'),
      place('town', 2, 21.6, 39.7, 'الجموم', 'Al Jumum'),
      place('suburb', 10, 21.456, 39.797, 'حي العزيزية', 'Al Aziziyah'),
    ];
    const r = regionToRows(els, cities);
    expect(r.rows.map((x) => [x.city_code, x.name_en])).toEqual([['sa-makkah', 'Al Aziziyah']]);
    expect(r.per_city['sa-makkah']).toEqual({ boundary: 0, nearest: 1 });
  });

  it('assigns by the containing boundary first, even when another city centre is nearer', () => {
    const els: OsmAny[] = [
      place('city', 1, 21.4225, 39.8262, 'مكة', 'Mecca'),
      place('town', 2, 21.6, 39.7, 'الجموم', 'Al Jumum'),
      square(7, 6, 'محافظة الجموم', 'Al Jumum Governorate', 21.45, 39.75, 21.7, 39.85), // contains the district below
      place('suburb', 10, 21.456, 39.797, 'حي الشرائع', 'Ash Shara\'i'),
    ];
    const r = regionToRows(els, cities);
    expect(r.rows[0].city_code).toBe('sa-al-jumum');
    expect(r.per_city['sa-al-jumum']).toEqual({ boundary: 1, nearest: 0 });
  });

  it('the smallest boundary that matches a city wins over a bigger one', () => {
    const els: OsmAny[] = [
      square(7, 6, 'محافظة الجموم', 'Al Jumum Governorate', 20.0, 39.0, 22.0, 41.0),
      square(8, 8, 'مكة المكرمة', 'Mecca', 21.3, 39.7, 21.6, 39.95),
      place('suburb', 10, 21.456, 39.797, 'حي العزيزية', 'Al Aziziyah'),
    ];
    expect(regionToRows(els, cities).rows[0].city_code).toBe('sa-makkah');
  });

  it('nearest-city fallback only within the maximum distance; farther is rejected with its reason', () => {
    const els: OsmAny[] = [
      place('city', 1, 24.71, 46.67, 'الرياض', 'Riyadh'),
      place('suburb', 10, 24.80, 46.70, 'حي قريب', 'Near'), // ~10 km
      place('suburb', 11, 25.40, 46.70, 'حي بعيد', 'Far'), // ~76 km
    ];
    const r = regionToRows(els, cities);
    expect(r.rows.map((x) => x.name_en)).toEqual(['Near']);
    expect(r.skipped.too_far).toBe(1);
    expect(regionToRows(els, cities, 100).rows).toHaveLength(2);
  });

  it('counts, never guesses: no point, one-language name, no city centre in the region', () => {
    const els: OsmAny[] = [
      place('city', 1, 24.71, 46.67, 'الرياض', 'Riyadh'),
      place('suburb', 21, 24.7, 46.7, 'حي بلا انجليزي'),
      { type: 'way', id: 22, tags: { place: 'suburb', 'name:ar': 'حي', 'name:en': 'NoPoint' } },
    ];
    const r = regionToRows(els, cities);
    expect(r.rows).toHaveLength(0);
    expect(r.skipped).toMatchObject({ no_ar_or_en_name: 1, no_point: 1 });
    expect(regionToRows([place('suburb', 30, 24.7, 46.7, 'حي', 'X')], cities).skipped.no_city_centre).toBe(1);
    expect(r.cities_without_centre).toContain('sa-no-node');
    expect(r.cities.map((c) => c.code)).toEqual(['sa-riyadh']);
  });

  it('retries a 504 and a timeout, stops at a 4xx, and reports the error instead of throwing', async () => {
    const ok = { ok: true, status: 200, json: async () => ({ elements: [] }) } as unknown as Response;
    const calls: number[] = [];
    const f1 = jest.fn(async () => { calls.push(1); return calls.length < 3 ? ({ ok: false, status: 504 } as Response) : ok; });
    expect(await queryOverpass('http://x', 'ua', 'q', { attempts: 3, attemptTimeoutMs: 1000, gapMs: 1, fetchImpl: f1 as unknown as typeof fetch })).toEqual({ elements: [] });
    expect(f1).toHaveBeenCalledTimes(3);
    const f2 = jest.fn(async () => ({ ok: false, status: 400 } as Response));
    expect((await queryOverpass('http://x', 'ua', 'q', { attempts: 3, attemptTimeoutMs: 1000, gapMs: 1, fetchImpl: f2 as unknown as typeof fetch })).error).toBe('http 400');
    expect(f2).toHaveBeenCalledTimes(1);
    const f3 = jest.fn(async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); });
    const r3 = await queryOverpass('http://x', 'ua', 'q', { attempts: 2, attemptTimeoutMs: 5, gapMs: 1, fetchImpl: f3 as unknown as typeof fetch });
    expect(r3.error).toContain('timeout after 5 ms');
  });
});

describe('merge and validate', () => {
  const part = (dir: string, iso: string, body: object, report: object) => {
    fs.writeFileSync(path.join(dir, `part-${iso}.json`), JSON.stringify(body));
    fs.writeFileSync(path.join(dir, `part-${iso}.json.report.json`), JSON.stringify(report));
  };

  it('merges the parts that exist, sums the assignment counts and reports every missing or failed region', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parts-'));
    const d = { city_code: 'sa-riyadh', name_ar: 'a', name_en: 'a', lat: 24, lng: 46, source: 'osm:node/1' };
    part(dir, 'SA-01', { cities: [{ code: 'sa-riyadh', lat: 24.7, lng: 46.7, source: 'osm:node/9' }], districts: [d] },
      { 'region:SA-01': { kept: 1, too_far: 2, no_city_centre: 0, per_city: { 'sa-riyadh': { boundary: 1, nearest: 0 } } } });
    part(dir, 'SA-02', { cities: [], districts: [] }, { 'region:SA-02': { error: 'http 504 (after 3 attempts)' } });
    fs.writeFileSync(path.join(dir, 'part-SA-03.json'), '{not json');
    const { merged, report } = mergeParts(dir);
    expect(merged.districts).toHaveLength(1);
    expect(merged.cities.map((c) => c.code)).toEqual(['sa-riyadh']);
    expect((report['region:SA-02'] as { error: string }).error).toContain('504');
    expect((report['region:SA-03'] as { error: string }).error).toContain('unreadable');
    expect((report['region:SA-04'] as { error: string }).error).toContain('missing');
    const a = report.assignment as Assignment;
    expect(a.totals).toEqual({ boundary: 1, nearest: 0, too_far: 2, no_city_centre: 0 });
    expect(a.centres).toEqual({ found: 1, from_place: 1, from_boundary: 0 });
    expect(a.cities_without_centre).toContain('sa-makkah');
  });

  it('drops a city whose centre two regions disagree on', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parts-'));
    part(dir, 'SA-01', { cities: [{ code: 'sa-bahrah', lat: 21.4, lng: 39.45, source: 'osm:node/1' }], districts: [] }, { 'region:SA-01': {} });
    part(dir, 'SA-02', { cities: [{ code: 'sa-bahrah', lat: 19.9, lng: 40.6, source: 'osm:node/2' }], districts: [] }, { 'region:SA-02': {} });
    const { merged, report } = mergeParts(dir);
    expect(merged.cities).toEqual([]);
    expect((report.assignment as Assignment).conflicting_centres).toEqual(['sa-bahrah']);
  });

  it('cleans English names: backtick, ʿayn and hamza marks and Arabic diacritics are dropped, apostrophes and letters are kept', () => {
    expect(cleanEnglishName('Al `Ud')).toBe('Al Ud');
    expect(cleanEnglishName('Ar Rabiʿ')).toBe('Ar Rabi');
    expect(cleanEnglishName('Ar Rabi`')).toBe('Ar Rabi');
    expect(cleanEnglishName('Al Qudsْ')).toBe('Al Quds');
    expect(cleanEnglishName("Ha'il  District")).toBe("Ha'il District");
  });

  it('validate writes the cleaned name, counts it, and keeps only valid city centres', () => {
    const codes = new Set(['sa-riyadh']);
    const res = validateExtract({
      cities: [{ code: 'sa-riyadh', lat: 24.7, lng: 46.7, source: 'osm:node/1' }, { code: 'sa-riyadh', lat: 24.8, lng: 46.7, source: 'osm:node/2' }, { code: 'sa-x', lat: 24, lng: 46, source: 's' }, { code: 'sa-riyadh', lat: 0, lng: 0, source: 's' }],
      districts: [{ city_code: 'sa-riyadh', name_ar: 'العود', name_en: 'Al `Ud', lat: 24.6, lng: 46.7, source: 'osm:node/3' }, { city_code: 'sa-riyadh', name_ar: 'حي العود', name_en: 'Al Ud District', lat: 24.6, lng: 46.7, source: 'osm:node/4' }],
    }, codes);
    expect(res.kept.map((k) => k.name_en)).toEqual(['Al Ud']);
    expect(res.cleanedEn).toBe(1);
    expect(res.rejected.duplicate).toBe(1);
    expect(res.cities).toEqual([{ code: 'sa-riyadh', lat: 24.7, lng: 46.7, source: 'osm:node/1' }]);
  });

  it('the summary shows per city: kept, boundary vs nearest, already in the seed, new, centre; plus the totals', () => {
    const codes = new Set(['sa-makkah']);
    const res = validateExtract({
      cities: [{ code: 'sa-makkah', lat: 21.42, lng: 39.82, source: 'osm:node/1' }],
      districts: [{ city_code: 'sa-makkah', name_ar: 'حي العزيزية', name_en: 'Al Aziziyah', lat: 21.45, lng: 39.79, source: 'osm:node/2' }],
    }, codes);
    const md = assignmentSummaryMarkdown(res, {
      'region:SA-02': { kept: 1, boundaries: { used: 3, unclosed: 1 } },
      assignment: { per_city: { 'sa-makkah': { boundary: 0, nearest: 1 } }, totals: { boundary: 0, nearest: 1, too_far: 4, no_city_centre: 0 }, centres: { found: 1, from_place: 1, from_boundary: 0 }, cities_without_centre: ['sa-x'] },
    }, [{ city: 'sa-makkah', existing: 40, extract: 1, matched: 1, centroid_fills: 1, already_has_centroid: 0, new: 0, rejected: 0 }]);
    expect(md).toContain('nearest-city fallback 1');
    expect(md).toContain('rejected (too far from every city) 4');
    expect(md).toContain('| sa-makkah | 1 | 0 | 0 | 1 | 1 | 0 | place |');
    expect(md).toContain('**Cities with no centre (1):** sa-x');
    expect(md).toContain('| SA-02 | 1 kept; 3 boundaries (1 unclosed) |');
  });
});
