import { mergeDateAndTime, isFutureSlot } from '../slotPick';

describe('slotPick', () => {
  it('takes the date from the first value and the time from the second', () => {
    const merged = mergeDateAndTime(new Date(2026, 9, 12, 3, 4, 5), new Date(2020, 0, 1, 14, 30, 59));
    expect(merged.getFullYear()).toBe(2026);
    expect(merged.getMonth()).toBe(9);
    expect(merged.getDate()).toBe(12);
    expect(merged.getHours()).toBe(14);
    expect(merged.getMinutes()).toBe(30);
    expect(merged.getSeconds()).toBe(0);
  });

  it('accepts only slots after now', () => {
    const now = new Date(2026, 9, 12, 10, 0, 0);
    expect(isFutureSlot(new Date(2026, 9, 12, 10, 1, 0), now)).toBe(true);
    expect(isFutureSlot(new Date(2026, 9, 12, 10, 0, 0), now)).toBe(false);
    expect(isFutureSlot(new Date(2026, 9, 11, 23, 0, 0), now)).toBe(false);
  });
});
