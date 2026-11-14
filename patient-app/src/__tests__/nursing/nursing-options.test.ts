import {
  OPTION_ERROR_CODES,
  choiceFields,
  choiceQuery,
  defaultChoice,
  normalizeChoice,
  optionErrorKey,
  parseNursingOptions,
  parseQuote,
} from '../../utils/nursingOptions';

const visit = { booking_mode: 'visit', booking_options: { recurrence: ['once', 'daily', 'weekly', 'monthly'], max_times: 10 } };
const cont = { booking_mode: 'continuous', booking_options: { hours: [4, 12, 24], shift: ['day', 'night'], period: ['day', 'days', 'week', 'month', 'open'], max_days: 14 } };
const prog = { booking_mode: 'programme', booking_options: { sessions: [10, 5, 5, 0, 'x'] } };

describe('parseNursingOptions', () => {
  it('reads the three shapes, bare or wrapped in data', () => {
    expect(parseNursingOptions(visit)).toEqual({ mode: 'visit', recurrence: ['once', 'daily', 'weekly', 'monthly'], maxTimes: 10 });
    expect(parseNursingOptions({ data: cont })).toMatchObject({ mode: 'continuous', hours: [4, 12, 24], maxDays: 14 });
    expect(parseNursingOptions(prog)).toEqual({ mode: 'programme', sessions: [5, 10] });
  });
  it('drops values the app does not know and rejects empty or missing lists', () => {
    expect(parseNursingOptions({ booking_mode: 'visit', booking_options: { recurrence: ['hourly', 'daily'] } })).toMatchObject({ recurrence: ['daily'], maxTimes: 30 });
    expect(parseNursingOptions({ booking_mode: 'visit', booking_options: { recurrence: ['hourly'] } })).toBeNull();
    expect(parseNursingOptions({ booking_mode: 'continuous', booking_options: { hours: [4], shift: [], period: ['day'] } })).toBeNull();
    expect(parseNursingOptions({ booking_mode: 'other', booking_options: {} })).toBeNull();
    expect(parseNursingOptions({ booking_mode: 'visit' })).toBeNull();
    expect(parseNursingOptions(null)).toBeNull();
  });
});

describe('choices', () => {
  it('defaults to the first offered value', () => {
    expect(defaultChoice(parseNursingOptions(visit)!)).toEqual({ recurrence: 'once', times: 1 });
    expect(defaultChoice(parseNursingOptions(cont)!)).toEqual({ hours: 4, shift: 'day', period: 'day', days: 1 });
    expect(defaultChoice(parseNursingOptions(prog)!)).toEqual({ times: 5 });
  });
  it('visit: once is always one time; the count is capped by max_times', () => {
    const o = parseNursingOptions(visit)!;
    expect(choiceFields(o, { recurrence: 'once', times: 7 })).toEqual({ recurrence: 'once', sessions_count: 1 });
    expect(choiceFields(o, { recurrence: 'weekly', times: 99 })).toEqual({ recurrence: 'weekly', sessions_count: 10 });
    expect(normalizeChoice(o, { recurrence: 'daily', times: 3 })).toEqual({ recurrence: 'daily', times: 3 });
  });
  it('continuous: days only when the period is days', () => {
    const o = parseNursingOptions(cont)!;
    expect(choiceFields(o, { hours: 12, shift: 'night', period: 'week', days: 5 })).toEqual({ hours: 12, shift: 'night', period: 'week' });
    expect(choiceFields(o, { hours: 12, shift: 'night', period: 'days', days: 5 })).toEqual({ hours: 12, shift: 'night', period: 'days', days: 5 });
    expect(choiceFields(o, { hours: 12, shift: 'night', period: 'days', days: 40 }).days).toBe(14);
    expect(choiceFields(o, { hours: 2, shift: 'day', period: 'open' })).toMatchObject({ hours: 4 }); // 2 is not offered
  });
  it('programme sends sessions_count from the list; no options sends nothing', () => {
    expect(choiceFields(parseNursingOptions(prog)!, { times: 10 })).toEqual({ sessions_count: 10 });
    expect(choiceFields(parseNursingOptions(prog)!, { times: 7 })).toEqual({ sessions_count: 5 });
    expect(choiceFields(null, { times: 3 })).toEqual({});
    expect(choiceQuery(null, {})).toBe('');
  });
  it('builds the quote query', () => {
    expect(choiceQuery(parseNursingOptions(cont)!, { hours: 12, shift: 'day', period: 'week' })).toBe('&hours=12&shift=day&period=week');
    expect(choiceQuery(parseNursingOptions(visit)!, { recurrence: 'daily', times: 3 })).toBe('&recurrence=daily&sessions_count=3');
  });
});

describe('parseQuote', () => {
  it('prefers the booking echo and falls back to the first line', () => {
    expect(parseQuote({ total: 300, lines: [{ qty: 3, unit_price: 100 }], booking: { billable_units: 3, unit_price: 100 } })).toEqual({ unit: 100, total: 300, billableUnits: 3 });
    expect(parseQuote({ total: 200, lines: [{ qty: 2, unit_price: 100 }] })).toEqual({ unit: 100, total: 200, billableUnits: 2 });
  });
  it('is null without a positive total', () => {
    expect(parseQuote({ total: 0, lines: [{ unit_price: 1 }] })).toBeNull();
    expect(parseQuote(null)).toBeNull();
  });
});

describe('optionErrorKey', () => {
  it('maps every documented code and nothing else', () => {
    for (const code of OPTION_ERROR_CODES) expect(optionErrorKey(code)).toBe(`nur.book.err.${code}`);
    expect(optionErrorKey('booking_hours_not_offered')).toBe('nur.book.err.booking_hours_not_offered');
    expect(optionErrorKey('Network request failed')).toBeNull();
    expect(optionErrorKey(undefined)).toBeNull();
  });
});
