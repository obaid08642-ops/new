import { describe, expect, it } from 'vitest';
import { readSehaMissing, waitingDays } from './seha-missing';

describe('seha-missing', () => {
  it('keeps only rows with an id and counts them', () => {
    const r = readSehaMissing({ days: 3, count: 9, items: [{ id: 'a', age_hours: 80 }, null, { nope: 1 }] });
    expect(r.count).toBe(1);
    expect(r.items[0].id).toBe('a');
  });
  it('a wrong shape is an empty list', () => {
    expect(readSehaMissing('x')).toEqual({ days: 3, count: 0, items: [] });
  });
  it('waiting days rounds down and is never negative', () => {
    expect(waitingDays({ age_hours: 80 })).toBe(3);
    expect(waitingDays({ age_hours: -5 })).toBe(0);
  });
});
