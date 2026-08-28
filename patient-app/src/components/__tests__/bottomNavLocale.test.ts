import { bottomNavLabel, isBottomNavRTL } from '../bottomNavLocale';

describe('bottom navigation locale contract', () => {
  it('uses RTL only for Arabic and Urdu rather than every app language', () => {
    expect(isBottomNavRTL('ar')).toBe(true);
    expect(isBottomNavRTL('ur')).toBe(true);
    expect(isBottomNavRTL('en')).toBe(false);
    expect(isBottomNavRTL('hi')).toBe(false);
    expect(isBottomNavRTL('bn')).toBe(false);
    expect(isBottomNavRTL('fil')).toBe(false);
  });

  it('returns a non-empty localized label for every primary navigation destination', () => {
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const) {
      for (const key of ['home', 'pharmacy', 'consultations', 'diagnostics', 'nursing'] as const) {
        expect(bottomNavLabel(lang, key).trim()).not.toBe('');
      }
    }
  });
});
