import { describe, expect, it } from 'vitest';
import { MODULE_LABELS, moduleLabel, moduleRows } from './module-switches';

describe('module switches helpers', () => {
  it('labels every backend key in Arabic and falls back to the key', () => {
    for (const key of ['pharmacy', 'consultations', 'labs_radiology', 'nursing', 'nutrition', 'maternity', 'mental_health', 'family', 'insurance', 'loyalty', 'ai', 'articles']) {
      expect(MODULE_LABELS[key]).toBeTruthy();
    }
    expect(moduleLabel('future_module')).toBe('future_module');
  });

  it('turns the GET /modules payload into rows; only an explicit false is off', () => {
    const rows = moduleRows({ modules: { pharmacy: true, loyalty: false, ai: true } });
    expect(rows.map((r) => [r.key, r.enabled])).toEqual([['pharmacy', true], ['loyalty', false], ['ai', true]]);
    expect(moduleRows(null)).toEqual([]);
    expect(moduleRows({})).toEqual([]);
  });
});
