import { facilityHoursRows, facilityPoint } from './facilityPage';

describe('facility page helpers (issue 767)', () => {
  it('names the days in the locale, in the Saudi week order, with an evening shift and closed days', () => {
    const rows = facilityHoursRows('en', [
      { day: 'fri', closed: true },
      { day: 'Saturday', open: '08:00', close: '12:00', open_evening: '16:00', close_evening: '20:00' },
    ], 'Closed');
    expect(rows).toEqual([{ label: 'Saturday', value: '08:00–12:00 · 16:00–20:00' }, { label: 'Friday', value: 'Closed' }]);
  });

  it('leaves out a day with no hours and a day it cannot name (nothing is invented)', () => {
    expect(facilityHoursRows('en', [{ day: 'wed' }, { day: 'someday', open: '08:00', close: '09:00' }], 'Closed')).toEqual([]);
  });

  it('takes a pin only when both numbers are real', () => {
    expect(facilityPoint(24.7, 46.6)).toEqual({ lat: 24.7, lng: 46.6 });
    expect(facilityPoint(null, 46.6)).toBeNull();
    expect(facilityPoint(95, 46.6)).toBeNull();
    expect(facilityPoint('24.7', 46.6)).toBeNull();
  });
});
