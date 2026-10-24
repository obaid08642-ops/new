import { SAUDI_LOCATIONS_SEED } from './seeds/saudi-locations.data';
import { LOCATION_TRANSLATIONS } from './seeds/location-translations.data';
import { buildBackup, checkConfirmation, planLocationFill, rollbackUpdate, tableSha256 } from './location-translation-fill';

const SCRIPT = { name_ur: /[؀-ۿ]/, name_hi: /[ऀ-ॿ]/, name_bn: /[ঀ-৿]/, name_tl: /[A-Za-z]/ } as const;

describe('location translations (issue 1831)', () => {
  it('belong to codes of the seed, as the country, a region or a city', () => {
    const byCode = new Map(SAUDI_LOCATIONS_SEED.map((l) => [l.code, l]));
    for (const code of Object.keys(LOCATION_TRANSLATIONS)) {
      expect(byCode.has(code)).toBe(true);
      expect(['country', 'region', 'city']).toContain(byCode.get(code)!.type);
    }
    expect(Object.keys(LOCATION_TRANSLATIONS).length).toBeGreaterThanOrEqual(60);
  });

  it('are written in the language\'s own script, non-empty', () => {
    for (const [code, t] of Object.entries(LOCATION_TRANSLATIONS)) {
      for (const field of Object.keys(SCRIPT) as Array<keyof typeof SCRIPT>) {
        expect({ code, field, ok: SCRIPT[field].test(t[field]) }).toEqual({ code, field, ok: true });
      }
    }
  });

  it('are not the Arabic name copied over', () => {
    const byCode = new Map(SAUDI_LOCATIONS_SEED.map((l) => [l.code, l]));
    for (const [code, t] of Object.entries(LOCATION_TRANSLATIONS)) expect(t.name_hi).not.toBe(byCode.get(code)!.name_ar);
  });
});

describe('planLocationFill (what the production migration would change)', () => {
  const table = { 'sa-riyadh': { name_ur: 'ریاض', name_hi: 'रियाद', name_bn: 'রিয়াদ', name_tl: 'Riyadh' } };

  it('fills only absent or empty fields and never overwrites a value already there', () => {
    const plan = planLocationFill([{ code: 'sa-riyadh', name_ur: 'کچھ اور', name_hi: '' }], table);
    expect(plan.changes.map((c) => c.field).sort()).toEqual(['name_bn', 'name_hi', 'name_tl']);
    expect(plan.kept).toEqual([{ code: 'sa-riyadh', field: 'name_ur' }]);
  });

  it('skips a code the export does not hold, and reports it', () => {
    const plan = planLocationFill([{ code: 'sa-jeddah' }], table);
    expect(plan.changes).toEqual([]);
    expect(plan.missing).toEqual(['sa-riyadh']);
  });

  it('needs the SHA-256 of the table as confirmation, and rolls back only what it wrote', () => {
    const sha = tableSha256(table);
    expect(checkConfirmation(sha, sha)).toBe(true);
    expect(checkConfirmation('other', sha)).toBe(false);
    expect(checkConfirmation(undefined, sha)).toBe(false);
    const plan = planLocationFill([{ code: 'sa-riyadh' }], table);
    const backup = buildBackup(plan, sha, '2026-10-24T00:00:00.000Z');
    expect(backup.changes).toHaveLength(4);
    expect(rollbackUpdate(backup.changes[0])).toEqual({ filter: { code: 'sa-riyadh', [backup.changes[0].field]: backup.changes[0].after }, update: { $unset: { [backup.changes[0].field]: '' } } });
  });
});
