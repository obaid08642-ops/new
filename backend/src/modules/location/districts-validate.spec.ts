import { KSA_BOX, summaryMarkdown, validateExtract } from '../../../scripts/geo/validate-districts-extract';

const cities = new Set(['sa-riyadh', 'sa-jeddah']);
const row = (over: Record<string, unknown> = {}) => ({ city_code: 'sa-riyadh', name_ar: 'العليا', name_en: 'Al Olaya', lat: 24.69, lng: 46.68, source: 'osm:node/1', ...over });

describe('validateExtract (the fetch workflow gate)', () => {
  it('keeps a complete row and counts the city', () => {
    const r = validateExtract({ districts: [row()] }, cities);
    expect(r.kept).toHaveLength(1);
    expect(r.perCity['sa-riyadh']).toEqual({ kept: 1, rejected: 0 });
  });

  it.each([
    ['missing_name', { name_en: '' }],
    ['missing_name', { name_ar: '  ' }],
    ['outside_kingdom', { lat: 51.5, lng: -0.12 }],
    ['outside_kingdom', { lat: 'x' }],
    ['no_source', { source: '' }],
    ['unknown_city', { city_code: 'sa-nowhere' }],
  ])('rejects %s', (reason, over) => {
    const r = validateExtract({ districts: [row(over)] }, cities);
    expect(r.kept).toHaveLength(0);
    expect((r.rejected as Record<string, number>)[reason as string]).toBe(1);
  });

  it('rejects a repeat in the same city even when only the spelling differs, but not the same name in another city', () => {
    const r = validateExtract({ districts: [row(), row({ name_ar: 'حي العليا', name_en: 'Olaya District', source: 'osm:node/2' }), row({ city_code: 'sa-jeddah', source: 'osm:node/3' })] }, cities);
    expect(r.kept.map((k) => k.city_code)).toEqual(['sa-riyadh', 'sa-jeddah']);
    expect(r.rejected.duplicate).toBe(1);
  });

  it('keeps the box around the kingdom', () => {
    expect(KSA_BOX.minLat).toBeLessThan(17);
    expect(KSA_BOX.maxLat).toBeGreaterThan(32);
    expect(validateExtract({ districts: [row({ lat: 24.7, lng: 46.7 })] }, cities).kept).toHaveLength(1);
  });

  it('writes a per-city summary, with the fetch errors', () => {
    const md = summaryMarkdown(validateExtract({ districts: [row()] }, cities), { 'sa-riyadh': { kept: 1 }, 'sa-jeddah': { error: 504 } });
    expect(md).toContain('1 districts kept');
    expect(md).toContain('| sa-jeddah | 0 | 0 | error 504 |');
  });
});
