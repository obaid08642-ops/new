import { appointmentStart, parseReportCollection } from './monthly-health-report-contract';

describe('monthly health report contract', () => {
  it('uses slot_start before a verified legacy scheduled_at field', () => {
    expect(appointmentStart({ slot_start: '2026-09-01T09:00:00.000Z', scheduled_at: '2026-08-01T09:00:00.000Z' })?.toISOString()).toBe('2026-09-01T09:00:00.000Z');
    expect(appointmentStart({ scheduled_at: '2026-08-01T09:00:00.000Z' })?.toISOString()).toBe('2026-08-01T09:00:00.000Z');
    expect(appointmentStart({ slot_start: 'not-a-date' })).toBeNull();
  });

  it('does not coerce malformed report results into an empty data set', () => {
    expect(parseReportCollection({ data: [] })).toEqual([]);
    expect(() => parseReportCollection({ items: [] })).toThrow('invalid report collection response');
  });
});
