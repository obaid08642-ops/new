import { PAST, UPCOMING, onTab } from './appointmentTabs';

describe('Q-18 appointment tabs', () => {
  it('every API state lands in exactly one tab', () => {
    const states = ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'CHECKED_IN', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    for (const s of states) {
      expect(onTab(s, 'upcoming') !== onTab(s, 'past')).toBe(true);
    }
  });

  it('in-progress and no-show are not homeless', () => {
    expect(onTab('IN_PROGRESS', 'upcoming')).toBe(true);
    expect(onTab('NO_SHOW', 'past')).toBe(true);
  });

  it('buckets stay lowercase codes', () => {
    expect([...UPCOMING, ...PAST].every((c) => c === c.toLowerCase())).toBe(true);
  });
});
