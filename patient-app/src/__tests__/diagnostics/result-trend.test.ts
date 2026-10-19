import { trendFor } from '../../utils/result-trend';

const row = (id: string, at: string, value: unknown, name = 'Hemoglobin') => ({ id, reported_at: at, entries: [{ name, value, unit: 'g/dL', flag: 'normal' }] });

describe('Ord11 result trend (app)', () => {
  it('returns the earlier numeric values of the same test, oldest first', () => {
    const list = { data: [row('r3', '2026-03-01', '13.9'), row('r1', '2025-11-01', 12.4), row('r2', '2026-01-10', 'x'), row('r4', '2026-06-01', 14.2, 'Glucose')] };
    expect(trendFor(list, 'Hemoglobin')).toEqual([
      { id: 'r1', at: '2025-11-01', value: 12.4, unit: 'g/dL', flag: 'normal' },
      { id: 'r3', at: '2026-03-01', value: 13.9, unit: 'g/dL', flag: 'normal' },
    ]);
  });

  it('is empty with fewer than two points and keeps the last six', () => {
    expect(trendFor([row('a', '2026-01-01', 1)], 'Hemoglobin')).toEqual([]);
    const many = Array.from({ length: 9 }, (_, i) => row(`r${i}`, `2026-0${i + 1}-01`, i));
    const out = trendFor(many, 'hemoglobin');
    expect(out).toHaveLength(6);
    expect(out[5].id).toBe('r8');
  });
});
