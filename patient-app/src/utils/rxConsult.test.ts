import { cartSpecialty, consultTarget, rxLineIds, specialtySlugOf } from './rxConsult';

describe('specialtySlugOf (GET /medicines/:id/consult-specialty)', () => {
  it('reads the slug of the mapped specialty, bare or wrapped in data', () => {
    const body = { medicine_id: 'm1', requires_prescription: true, specialty: { slug: 'internal_medicine', name_ar: 'باطنة', name_en: 'Internal Medicine' }, source: 'category' };
    expect(specialtySlugOf(body)).toBe('internal_medicine');
    expect(specialtySlugOf({ data: body })).toBe('internal_medicine');
  });

  it('is null when the admin mapped nothing or the body is not an answer', () => {
    expect(specialtySlugOf({ medicine_id: 'm1', specialty: null, source: null })).toBeNull();
    expect(specialtySlugOf(null)).toBeNull();
    expect(specialtySlugOf('x')).toBeNull();
    expect(specialtySlugOf({ specialty: { slug: '../etc' } })).toBeNull();
  });
});

describe('cartSpecialty', () => {
  it('suggests the one specialty the lines agree on; unmapped lines do not vote', () => {
    expect(cartSpecialty(['pediatrics', 'pediatrics'])).toBe('pediatrics');
    expect(cartSpecialty(['pediatrics', null])).toBe('pediatrics');
  });

  it('suggests nothing for a mixed or unmapped cart', () => {
    expect(cartSpecialty(['pediatrics', 'cardiology'])).toBeNull();
    expect(cartSpecialty([null, null])).toBeNull();
    expect(cartSpecialty([])).toBeNull();
  });
});

describe('rxLineIds and consultTarget', () => {
  it('asks only about prescription lines, once each, at most five', () => {
    const lines = [{ id: 'a', rx: true }, { id: 'b', rx: false }, { id: 'a', rx: true }, ...['c', 'd', 'e', 'f', 'g'].map((id) => ({ id, rx: true }))];
    expect(rxLineIds(lines)).toEqual(['a', 'c', 'd', 'e', 'f']);
  });

  it('opens the doctors of the specialty by slug, or the full list when there is none', () => {
    expect(consultTarget('cardiology')).toEqual({ pathname: '/consultations/doctor-search', params: { specialty: 'cardiology' } });
    expect(consultTarget(null)).toEqual({ pathname: '/consultations/specialty-select' });
  });
});
