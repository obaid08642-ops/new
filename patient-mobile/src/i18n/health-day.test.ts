import { healthDayT, healthDayTranslations } from './health-day';

describe('health-day translations', () => {
  it('contains the full dashboard vocabulary in every supported language', () => {
    const keys = Object.keys(healthDayTranslations.ar).sort();
    for (const copy of Object.values(healthDayTranslations)) {
      expect(Object.keys(copy).sort()).toEqual(keys);
      for (const key of keys) expect(copy[key]).toEqual(expect.any(String));
    }
  });

  it('interpolates user-record values and safely falls back to Arabic', () => {
    expect(healthDayT('en', 'mealsCount', { count: 3 })).toBe('3 meals logged');
    expect(healthDayT('unknown', 'waterAmount', { count: 600 })).toBe('600 مل مسجل');
  });
});
