/**
 * Owner request 2026-10-23: every user-visible catalogue field is present and translated in ar, en, ur, hi, bn, fil on the
 * seed data. Runs tools/catalog/translation-coverage.mjs --check (exit 1 on any missing / empty / English-left / placeholder
 * value) and the pure helpers of the translations-fill migration.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { companyFields, fillSet } from '../../../scripts/migrations/2026-10-catalogue-translations-fill';

const ROOT = path.resolve(__dirname, '../../../..');

describe('catalogue translation coverage', () => {
  it('seed data has no translation gap (tools/catalog/translation-coverage.mjs --check)', () => {
    const r = spawnSync('node', ['tools/catalog/translation-coverage.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('the fill migration only fills empty fields and never overwrites an existing translation', () => {
    expect(fillSet({ name_ur: 'پہلے سے' }, { name_ur: 'نیا', name_hi: 'नया', name_bn: '' })).toEqual({ name_hi: 'नया' });
    expect(fillSet({ name_ur: 'پہلے سے' }, { name_ur: 'نیا' }, true)).toEqual({ name_ur: 'نیا' });
  });

  it('a TPA gets its corrected Arabic and English description, an insurer keeps its own', () => {
    const base = { code: 'x', plans: [], description_ar: 'ع', description_en: 'e', description_ur: 'u' };
    expect(companyFields(base, true)).toEqual(expect.objectContaining({ description_ar: 'ع', description_en: 'e' }));
    expect(companyFields(base, false)).not.toHaveProperty('description_ar');
  });
});
