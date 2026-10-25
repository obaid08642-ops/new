import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { REGIONS, queryOverpass, regionQuery, regionToRows } from '../../../scripts/geo/fetch-osm-districts-region';
import { mergeParts } from '../../../scripts/geo/merge-districts-parts';

const cities = [
  { code: 'sa-riyadh', name_ar: 'الرياض', name_en: 'Riyadh' },
  { code: 'sa-al-kharj', name_ar: 'مدينة الخرج', name_en: 'Al-Kharj' },
  { code: 'sa-no-node', name_ar: 'مدينة بلا عقدة', name_en: 'Nowhere' },
];
const place = (kind: string, id: number, lat: number, lng: number, ar?: string, en?: string) => ({
  type: 'node' as const, id, lat, lon: lng, tags: { place: kind, ...(ar ? { 'name:ar': ar } : {}), ...(en ? { 'name:en': en } : {}) },
});

describe('districts by region', () => {
  it('has the 13 regions and a query only for a valid ISO code', () => {
    expect(REGIONS).toHaveLength(13);
    expect(regionQuery('SA-01')).toContain('"ISO3166-2"="SA-01"');
    expect(() => regionQuery('SA-01"; drop')).toThrow();
  });

  it('assigns each place to the nearest city centre of the region, by the city name in Arabic or English', () => {
    const els = [
      place('city', 1, 24.71, 46.67, 'الرياض', 'Riyadh'),
      place('town', 2, 24.15, 47.31, 'الخرج', 'Al Kharj'),
      place('suburb', 10, 24.75, 46.7, 'حي الملقا', 'Al Malqa'),
      place('neighbourhood', 11, 24.16, 47.3, 'حي الشفاء', 'Ash Shifa'),
      place('quarter', 12, 24.2, 47.0, 'حي بعيد', 'Far'), // ~30 km from both → nearest wins (Al-Kharj)
    ];
    const { rows, cities_without_centre } = regionToRows(els, cities);
    expect(rows.find((r) => r.name_en === 'Al Malqa')?.city_code).toBe('sa-riyadh');
    expect(rows.find((r) => r.name_en === 'Ash Shifa')?.city_code).toBe('sa-al-kharj');
    expect(rows.find((r) => r.name_en === 'Far')?.city_code).toBe('sa-al-kharj');
    expect(rows.every((r) => r.source.startsWith('osm:'))).toBe(true);
    expect(cities_without_centre).toEqual(['sa-no-node']);
  });

  it('counts, never guesses: too far, no point, one-language name, no city centre in the region', () => {
    const els = [
      place('city', 1, 24.71, 46.67, 'الرياض', 'Riyadh'),
      place('suburb', 20, 27.0, 49.0, 'حي نائي', 'Remote'), // hundreds of km away
      place('suburb', 21, 24.7, 46.7, 'حي بلا انجليزي'),
      { type: 'way' as const, id: 22, tags: { place: 'suburb', 'name:ar': 'حي', 'name:en': 'NoPoint' } },
    ];
    const { rows, skipped } = regionToRows(els, cities);
    expect(rows).toHaveLength(0);
    expect(skipped).toMatchObject({ too_far: 1, no_ar_or_en_name: 1, no_point: 1 });
    const none = regionToRows([place('suburb', 30, 24.7, 46.7, 'حي', 'X')], cities);
    expect(none.skipped.no_city_centre).toBe(1);
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

  it('merges the parts that exist and reports every missing or failed region', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parts-'));
    fs.writeFileSync(path.join(dir, 'part-SA-01.json'), JSON.stringify({ cities: [], districts: [{ city_code: 'sa-riyadh', name_ar: 'a', name_en: 'a', lat: 24, lng: 46, source: 'osm:node/1' }] }));
    fs.writeFileSync(path.join(dir, 'part-SA-01.json.report.json'), JSON.stringify({ 'region:SA-01': { kept: 1 } }));
    fs.writeFileSync(path.join(dir, 'part-SA-02.json'), JSON.stringify({ cities: [], districts: [] }));
    fs.writeFileSync(path.join(dir, 'part-SA-02.json.report.json'), JSON.stringify({ 'region:SA-02': { error: 'http 504 (after 3 attempts)' } }));
    fs.writeFileSync(path.join(dir, 'part-SA-03.json'), '{not json');
    const { merged, report } = mergeParts(dir);
    expect(merged.districts).toHaveLength(1);
    expect((report['region:SA-02'] as { error: string }).error).toContain('504');
    expect((report['region:SA-03'] as { error: string }).error).toContain('unreadable');
    expect((report['region:SA-04'] as { error: string }).error).toContain('missing');
  });
});
