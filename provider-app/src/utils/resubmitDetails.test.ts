import { changedDetails, detailProblems, detailsFromProfile } from './resubmitDetails';

describe('resubmit details', () => {
  const initial = detailsFromProfile({ name_ar: 'مختبر', license_number: '123', license_expiry_date: '2026-01-05T00:00:00.000Z', iban: 'SA0380000000608010167519', city: 'جدة' });

  it('reads the profile, trims, and shows the licence date as a day', () => {
    expect(initial.license_expiry_date).toBe('2026-01-05');
    expect(initial.name_en).toBe('');
    expect(detailsFromProfile(null).city).toBe('');
  });
  it('sends only what changed; an empty box never erases a stored value', () => {
    expect(changedDetails(initial, { ...initial })).toEqual({});
    expect(changedDetails(initial, { ...initial, license_number: ' 456 ', city: '' })).toEqual({ license_number: '456' });
  });
  it('normalises the IBAN', () => {
    expect(changedDetails(initial, { ...initial, iban: 'sa03 1000 0000 6080 1016 7519' })).toEqual({ iban: 'SA0310000000608010167519' });
  });
  it('flags a bad IBAN or date before anything is sent', () => {
    expect(detailProblems({ iban: 'SA12' })).toEqual(['iban']);
    expect(detailProblems({ license_expiry_date: '05/01/2027' })).toEqual(['license_expiry_date']);
    expect(detailProblems({ license_expiry_date: '2027-01-05', iban: 'SA0310000000608010167519' })).toEqual([]);
  });
});
