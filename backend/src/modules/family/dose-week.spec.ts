import { doseWeek } from './family.service';

describe('journeys 68: a member\'s doses of the last seven days', () => {
  it('keeps the week, newest first, with the taken and missed counts', () => {
    const now = Date.parse('2026-10-15T12:00:00Z');
    const day = 24 * 60 * 60 * 1000;
    const out = doseWeek([
      { at: new Date(now - 1 * day), status: 'taken', time_key: '08:00' },
      { at: new Date(now - 2 * day), status: 'missed', time_key: '20:00' },
      { at: new Date(now - 10 * day), status: 'missed', time_key: '08:00' },
      { at: 'not a date', status: 'taken' },
      { at: new Date(now - 3 * day), status: 'unknown' },
    ], now);
    expect(out.taken_7d).toBe(1);
    expect(out.missed_7d).toBe(1);
    expect(out.doses.map((d) => d.status)).toEqual(['taken', 'missed']);
    expect(out.doses[1]).toMatchObject({ time_key: '20:00' });
  });

  it('is empty without a log', () => {
    expect(doseWeek(undefined)).toEqual({ doses: [], taken_7d: 0, missed_7d: 0 });
  });
});
