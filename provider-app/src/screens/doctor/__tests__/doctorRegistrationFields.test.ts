import { isFutureLicenseDate, splitSubSpecialties } from '../doctorRegistrationFields';

describe('doctor registration: fields the backend requires at submit', () => {
  const now = new Date('2026-10-24T12:00:00');

  it('the licence expiry must be a real date that is today or later', () => {
    expect(isFutureLicenseDate('2026-10-24', now)).toBe(true);
    expect(isFutureLicenseDate('2031-12-31', now)).toBe(true);
    expect(isFutureLicenseDate('2026-10-23', now)).toBe(false);
    expect(isFutureLicenseDate('', now)).toBe(false);
    expect(isFutureLicenseDate('31/12/2031', now)).toBe(false);
    expect(isFutureLicenseDate('2031-13-45', now)).toBe(false);
  });

  it('the sub-specialty is a non-empty list; commas (Latin or Arabic) separate several', () => {
    expect(splitSubSpecialties('Interventional cardiology, Heart failure')).toEqual(['Interventional cardiology', 'Heart failure']);
    expect(splitSubSpecialties('قلب أطفال،قسطرة')).toEqual(['قلب أطفال', 'قسطرة']);
    expect(splitSubSpecialties('  ,  ')).toEqual([]);
    expect(splitSubSpecialties('')).toEqual([]);
  });
});
