import { insuranceOffered, normalizeLabList } from './labMappers';

jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));

describe('insuranceOffered (diagnostics hub payment filter, issue 622)', () => {
  const list = (rows: unknown[]) => normalizeLabList(rows);

  it('is true when a service takes insurance (insurance_availability: true)', () => {
    expect(insuranceOffered(list([{ id: 'a', name_en: 'A', cash_availability: true }, { id: 'b', name_en: 'B', insurance_availability: true }]))).toBe(true);
  });

  it('is false when none does, so the insurance choice is hidden instead of leading to an empty list', () => {
    expect(insuranceOffered(list([{ id: 'a', name_en: 'A', insurance_availability: false }, { id: 'b', name_en: 'B' }]))).toBe(false);
    expect(insuranceOffered([])).toBe(false);
  });
});
