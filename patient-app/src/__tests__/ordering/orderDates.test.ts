jest.mock('react-native-localize', () => ({ getCalendar: () => 'gregorian' }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) }));

import { dateFormatterFor } from '../../utils/dates';

const AT = '2026-10-23T14:30:00Z';
const day = (lang: string) => dateFormatterFor(lang).fmtDate(AT, { weekday: 'long', timeZone: 'UTC' });
const time = (lang: string) => dateFormatterFor(lang).fmtTime(AT, { timeZone: 'UTC' });

describe('dateFormatterFor: dates follow the language of the app', () => {
  it('English shows an English day name and Latin digits', () => {
    expect(day('en')).toBe('Friday');
    expect(time('en')).toMatch(/^02:30/);
  });
  it('Arabic keeps the Arabic day name with Latin digits', () => {
    expect(day('ar')).toBe('الجمعة');
    expect(time('ar')).toMatch(/2:30/);
    expect(time('ar')).toMatch(/^[^٠-٩]*$/);
  });
  it('Bengali, Hindi, Urdu and Filipino do not fall back to Arabic day names', () => {
    for (const lang of ['bn', 'hi', 'fil']) expect(/[؀-ۿ]/.test(day(lang))).toBe(false);
    expect(day('ur')).not.toBe('الجمعة');
  });
});
