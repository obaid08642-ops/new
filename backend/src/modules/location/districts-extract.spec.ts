import * as fs from 'fs';
import * as path from 'path';
import { normalizeDistrictName, planImport, type Extract } from './districts-plan';

/**
 * The extract shipped in the image (data/districts-extract.v1.json): whatever is committed there must be real, sourced rows.
 * Empty is allowed (the step then plans nothing); a row without a source, a name in both languages or a point inside Saudi Arabia is not.
 */
const file = path.join(__dirname, 'data/districts-extract.v1.json');
const extract: Extract = JSON.parse(fs.readFileSync(file, 'utf8'));

describe('packaged districts extract', () => {
  it('is valid JSON with cities and districts arrays', () => {
    expect(Array.isArray(extract.cities)).toBe(true);
    expect(Array.isArray(extract.districts)).toBe(true);
  });

  it('every district has both names, a point inside the kingdom and a source, and none repeats within its city', () => {
    const seen = new Set<string>();
    for (const d of extract.districts) {
      expect(d.name_ar?.trim()).toBeTruthy();
      expect(d.name_en?.trim()).toBeTruthy();
      expect(d.source?.trim()).toBeTruthy();
      expect(d.lat).toBeGreaterThanOrEqual(16); expect(d.lat).toBeLessThanOrEqual(32.5);
      expect(d.lng).toBeGreaterThanOrEqual(34); expect(d.lng).toBeLessThanOrEqual(56);
      const key = `${d.city_code}|${normalizeDistrictName(d.name_ar)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    for (const c of extract.cities ?? []) expect(c.source?.trim()).toBeTruthy();
  });

  it('plans without rejections against an empty city list when empty, and never throws', () => {
    const plan = planImport([], { cities: [], districts: [] });
    expect(plan.rejected).toEqual([]);
  });
});
