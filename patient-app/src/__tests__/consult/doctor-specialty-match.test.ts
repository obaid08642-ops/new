import { doctorHasSpecialty } from '../../utils/consultSpecialties';

/** Reconciliation row 100: the doctors list filtered on the Arabic specialty name only, so a profile that stores the slug (the canonical form) never matched. */
const cardiology = { slug: 'cardiology', name_ar: 'قلب', name_en: 'Cardiology', specialty: 'قلب' };

describe('doctorHasSpecialty (the same three forms GET /care/specialties counts)', () => {
  it('matches the canonical slug, the Arabic name and the English name', () => {
    expect(doctorHasSpecialty('cardiology', cardiology)).toBe(true);
    expect(doctorHasSpecialty('قلب', cardiology)).toBe(true);
    expect(doctorHasSpecialty('Cardiology', cardiology)).toBe(true);
    expect(doctorHasSpecialty('  cardiology ', cardiology)).toBe(true);
  });

  it('does not match another specialty, an empty value or an unknown specialty', () => {
    expect(doctorHasSpecialty('dermatology', cardiology)).toBe(false);
    expect(doctorHasSpecialty('جلدية', cardiology)).toBe(false);
    expect(doctorHasSpecialty('', cardiology)).toBe(false);
    expect(doctorHasSpecialty(undefined, cardiology)).toBe(false);
    expect(doctorHasSpecialty('cardiology', undefined)).toBe(false);
  });

  it('a row without an Arabic name falls back to its specialty text', () => {
    expect(doctorHasSpecialty('قلب', { slug: 'cardiology', specialty: 'قلب' })).toBe(true);
  });
});
