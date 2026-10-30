import { bookingChoiceLine } from '../bookingChoice';

describe('bookingChoiceLine', () => {
  it('continuous care: hours, shift, period', () => {
    expect(bookingChoiceLine({ booking_mode: 'continuous', hours: 12, shift: 'night', period: 'week' }, false)).toBe('Continuous care: 12 h · night shift · per week');
    expect(bookingChoiceLine({ booking_mode: 'continuous', hours: 12, shift: 'night', period: 'week' }, true)).toBe('رعاية مستمرة: 12 ساعة · ليلية · أسبوع');
  });
  it('programme: the number of sessions', () => {
    expect(bookingChoiceLine({ booking_mode: 'programme', sessions_count: 8 }, false)).toBe('Programme: 8 sessions');
  });
  it('visit: only a recurring one is worth a line', () => {
    expect(bookingChoiceLine({ booking_mode: 'visit', recurrence: 'weekly' }, false)).toBe('Recurring visit: Weekly');
    expect(bookingChoiceLine({ booking_mode: 'visit', recurrence: 'once' }, false)).toBeNull();
  });
  it('nothing for an older booking or no booking', () => {
    expect(bookingChoiceLine({}, false)).toBeNull();
    expect(bookingChoiceLine(undefined, true)).toBeNull();
  });
});
