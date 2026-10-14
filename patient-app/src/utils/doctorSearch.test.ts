import { DOCTOR_SORTS, doctorRows, doctorsQuery } from './doctorSearch';

const pick = (ar: string | null, en: string | null) => ar ?? en;
const slot = (iso: string) => `slot:${iso}`;

/** The public doctor card GET /care/doctors returns (care.service.ts toPublicDoctor), wrapped in the page object. */
const ANSWER = {
  page: 1,
  limit: 20,
  total: 2,
  items: [
    {
      id: 'd1', slug: 'sara', name_ar: 'د. سارة', name_en: 'Dr. Sara', specialty: 'cardiology', title: 'استشاري', academic_degree: 'MD',
      years_experience: 12, consultation_modes: ['clinic', 'online'], price_clinic: 200, price_online: 150, price_home: null,
      hospital: 'مستشفى النور', rating: 4.8, reviews_count: 31, accepts_insurance: true, next_available_at: '2026-10-07T09:30:00.000Z',
    },
    { id: 'd2', name_ar: null, name_en: 'Dr. Omar', specialty: 'dentistry', consultation_modes: ['home'], price_home: 90, rating: null, reviews_count: 0, accepts_insurance: false, next_available_at: null },
  ],
};

describe('doctors search: the real answer shape and query names', () => {
  it('reads items[] and maps the fields the server really sends', () => {
    const rows = doctorRows(ANSWER, pick, slot);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: 'd1', name: 'د. سارة', deg: 'MD', spec: 'cardiology', rating: 4.8, reviews: 31, price: 200, wait: null, exp: 12,
      online: true, clinic: true, home: false, ins: true, hospital: 'مستشفى النور', slot: 'slot:2026-10-07T09:30:00.000Z',
    });
    expect(rows[1]).toMatchObject({ id: 'd2', name: 'Dr. Omar', deg: null, rating: null, price: 90, home: true, clinic: false, online: false, ins: false, slot: null });
  });

  it('never invents a value: the server has no waiting-time data, so wait is always null', () => {
    expect(doctorRows(ANSWER, pick, slot).every((r) => r.wait === null)).toBe(true);
  });

  it('drops an item with no id or no name, and tolerates a bare array, null and junk', () => {
    expect(doctorRows({ items: [{ id: 'x' }, { name_ar: 'بلا معرّف' }, null] }, pick, slot)).toEqual([]);
    expect(doctorRows([ANSWER.items[1]], pick, slot)).toHaveLength(1);
    expect(doctorRows(null, pick, slot)).toEqual([]);
    expect(doctorRows({ data: ANSWER.items }, pick, slot)).toEqual([]); // the old shape is not what the server sends
    expect(doctorRows('nope', pick, slot)).toEqual([]);
  });

  it('asks with the names the controller reads: q, specialty and sort (rating | price_asc)', () => {
    expect(doctorsQuery({ q: ' سارة ', specialty: 'dentistry', sort: 'price_asc' })).toBe('q=%D8%B3%D8%A7%D8%B1%D8%A9&specialty=dentistry&sort=price_asc');
    expect(doctorsQuery({ q: '', sort: 'rating' })).toBe('sort=rating');
    expect(doctorsQuery({})).toBe('');
    expect(doctorsQuery({ q: 'x' })).not.toContain('search=');
  });

  it('offers only sorts the server knows (no waiting-time sort)', () => {
    expect([...DOCTOR_SORTS]).toEqual(['rating', 'price_asc']);
  });
});
