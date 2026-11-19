import { shouldCancelForLapse, LICENCE_LAPSE_KEEP_MS as DAY } from './licence-lapse-cancel';

/** D2 (owner 2026-11-17): future confirmed visits are cancelled when the licence lapsed; what starts inside the next 24 h is kept only while the lapse is under 24 h old. */
describe('shouldCancelForLapse', () => {
  const now = Date.parse('2026-12-01T12:00:00Z');
  const H = 3600_000;

  it('a visit MORE than 24 h away is always cancelled, whenever the licence lapsed', () => {
    expect(shouldCancelForLapse(now + 25 * H, now, now - 1 * H)).toBe(true);
    expect(shouldCancelForLapse(now + 25 * H, now, now - 30 * H)).toBe(true);
    expect(shouldCancelForLapse(now + 30 * 24 * H, now, now)).toBe(true);
  });

  it('a visit inside the next 24 h is KEPT while the licence lapsed less than 24 h ago', () => {
    expect(shouldCancelForLapse(now + 2 * H, now, now - 1 * H)).toBe(false);
    expect(shouldCancelForLapse(now + 23 * H, now, now - 23 * H)).toBe(false);
    expect(shouldCancelForLapse(now + 1 * H, now, now)).toBe(false);
  });

  it('a visit inside the next 24 h is cancelled once the licence lapsed 24 h ago or more', () => {
    expect(shouldCancelForLapse(now + 2 * H, now, now - DAY)).toBe(true);
    expect(shouldCancelForLapse(now + 2 * H, now, now - 3 * 24 * H)).toBe(true);
  });

  it('the 24 h edges: exactly 24 h away counts as "more than within", exactly 24 h lapsed counts as 24 h ago', () => {
    expect(shouldCancelForLapse(now + DAY, now, now - 1 * H)).toBe(true);
    expect(shouldCancelForLapse(now + DAY - 1, now, now - 1 * H)).toBe(false);
    expect(shouldCancelForLapse(now + 2 * H, now, now - DAY + 1)).toBe(false);
  });

  it('a visit that already started or passed is never touched, and bad input is never a cancel', () => {
    expect(shouldCancelForLapse(now, now, now - 5 * DAY)).toBe(false);
    expect(shouldCancelForLapse(now - H, now, now - 5 * DAY)).toBe(false);
    expect(shouldCancelForLapse(NaN, now, now)).toBe(false);
    expect(shouldCancelForLapse(now + 2 * DAY, now, NaN)).toBe(false);
  });
});
