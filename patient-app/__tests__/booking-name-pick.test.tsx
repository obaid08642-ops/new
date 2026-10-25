// Names of catalogue data are Arabic and English only (owner decision 2026-10-25): Arabic on the Arabic app, English on every other.
let mockLang = 'ar';
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/localize', () => ({
  currentDbLang: () => mockLang,
  pickLocalized: (ar: unknown, en: unknown) => (mockLang === 'ar' ? ar ?? en : en ?? ar),
}));

import { pickBookingName } from '../src/utils/bookingName';

describe('pickBookingName', () => {
  const names = { ar: 'غيار', en: 'Dressing', hi: 'ड्रेसिंग', tl: 'Pagbabalot' };

  it('shows Arabic on the Arabic app and English on every other language, ignoring any other language in the map', () => {
    mockLang = 'ar';
    expect(pickBookingName(names, 'قديم', 'old')).toBe('غيار');
    for (const lang of ['en', 'ur', 'hi', 'bn', 'tl']) {
      mockLang = lang;
      expect(pickBookingName(names, 'قديم', 'old')).toBe('Dressing');
    }
  });

  it('falls back to the other language of the map, then to the stored pair', () => {
    mockLang = 'hi';
    expect(pickBookingName({ ar: 'غيار' }, 'قديم', 'old')).toBe('غيار');
    expect(pickBookingName({}, 'قديم', 'old')).toBe('old');
    expect(pickBookingName(undefined, 'قديم', 'old')).toBe('old');
    mockLang = 'ar';
    expect(pickBookingName({ en: 'Dressing' }, 'قديم', 'old')).toBe('Dressing');
  });
});
