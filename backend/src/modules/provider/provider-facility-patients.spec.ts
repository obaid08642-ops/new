import { ProviderFacilityController } from './provider-facility.controller';

// Audit-3 gap 20: the facility's patient tracker returns where the patient is, since when and with whom, not only {id, name, phone, email}.
describe('facility patient tracker (GET /provider/facility/patients/active)', () => {
  function make(c: Record<string, any[]>) {
    const filters: Record<string, any> = {};
    const conn: any = {
      collection: (n: string) => ({
        findOne: async () => (c[n] ?? [])[0] ?? null,
        find: (f: any) => {
          filters[n] = f;
          const cur: any = { sort: () => cur, limit: () => cur, project: () => cur, toArray: async () => c[n] ?? [] };
          return cur;
        },
      }),
    };
    return { ctrl: new ProviderFacilityController(conn), filters };
  }
  const hosp = { id: 'h1' };
  const base = {
    provider_accounts: [{ id: 'h1', facility_id: 'f1' }],
    users: [{ id: 'p1', full_name: 'Sara', phone: '050', email: 's@x' }, { id: 'p2', full_name: 'Omar', phone: '055', email: 'o@x' }],
  };

  it('an inpatient carries admission date, ward, bed and bed type', async () => {
    const t = make({
      ...base,
      appointments: [],
      facility_admissions: [{ id: 'adm1', patient_id: 'p1', bed_id: 'b1', facility_id: 'f1', status: 'active', admitted_at: new Date('2026-11-01T08:00:00Z') }],
      facility_beds: [{ id: 'b1', ward_id: 'w1', bed_number: '12', type: 'icu' }],
      facility_wards: [{ id: 'w1', name: 'Cardiac ward' }],
    });
    const rows: any[] = await t.ctrl.activePatients(hosp);
    const sara = rows.find((r) => r.id === 'p1');
    expect(sara).toMatchObject({ name: 'Sara', kind: 'inpatient', admission_id: 'adm1', ward_name: 'Cardiac ward', bed_number: '12', bed_type: 'icu' });
    expect(new Date(sara.admitted_at).toISOString()).toBe('2026-11-01T08:00:00.000Z');
    expect(t.filters.facility_admissions).toEqual({ facility_id: 'f1', status: 'active' });
  });

  it('a booked patient carries the next appointment and the doctor\'s name', async () => {
    const t = make({
      ...base,
      facility_admissions: [],
      appointments: [{ id: 'a1', patient_id: 'p2', doctor_id: 'pp1', slot_start: new Date('2026-11-09T10:00:00Z'), status: 'CONFIRMED' }],
      provider_profiles: [{ id: 'pp1', display_name_ar: 'د. ليلى', display_name_en: 'Dr Layla' }],
    });
    const rows: any[] = await t.ctrl.activePatients(hosp);
    const omar = rows.find((r) => r.id === 'p2');
    expect(omar).toMatchObject({ kind: 'booked', admission_id: null, ward_name: null, appointment_id: 'a1', appointment_status: 'CONFIRMED', doctor_name: 'د. ليلى', doctor_name_en: 'Dr Layla' });
    expect(new Date(omar.appointment_at).toISOString()).toBe('2026-11-09T10:00:00.000Z');
  });

  it('keeps the old fields and invents none: no MRN, no clinical status', async () => {
    const t = make({ ...base, facility_admissions: [], appointments: [{ id: 'a1', patient_id: 'p1', doctor_id: 'x', status: 'CONFIRMED' }] });
    const [row]: any[] = await t.ctrl.activePatients(hosp);
    expect(row).toMatchObject({ id: 'p1', name: 'Sara', phone: '050', email: 's@x' });
    expect(row).not.toHaveProperty('mrn');
    expect(row).not.toHaveProperty('status');
  });

  it('no patients, no lookups: an empty list', async () => {
    const t = make({ ...base, facility_admissions: [], appointments: [] });
    expect(await t.ctrl.activePatients(hosp)).toEqual([]);
  });
});
