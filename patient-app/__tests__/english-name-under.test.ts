import { englishNameUnder } from '../src/utils/englishNameUnder';

// Owner decision E (issue 1556): ur, hi and bn show the English name under the localized one; ar, en and tl do not.
describe('englishNameUnder', () => {
  it.each(['ur', 'hi', 'bn'])('%s: the English name under the localized one', (lang) => {
    expect(englishNameUnder(lang, 'पैनाडोल 500', 'Panadol 500 mg')).toBe('Panadol 500 mg');
  });
  it.each(['ar', 'en', 'tl', 'fil'])('%s: no English line', (lang) => {
    expect(englishNameUnder(lang, 'بانادول 500', 'Panadol 500 mg')).toBe('');
  });
  it('nothing when the names are the same or the English name is empty', () => {
    expect(englishNameUnder('ur', 'Panadol', 'Panadol')).toBe('');
    expect(englishNameUnder('hi', 'पैनाडोल', '')).toBe('');
    expect(englishNameUnder('bn', 'প্যানাডল', null)).toBe('');
  });
});
