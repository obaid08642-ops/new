import { LegalEnterpriseService } from './legal-enterprise.service';
import { LICENCE_LAPSE_CANCEL_EVENT } from '../../common/licence-lapse-cancel';

/** D2 follow-up (lead decision 2026-11-19): a lapsed HOSPITAL or CLINIC licence cancels the confirmed future consultations of the doctors who work for it (24 h rule). */
describe('licence lapse sweep: hospitals and clinics', () => {
  const H = 3600_000;
  const now = Date.parse('2026-12-01T12:00:00Z');
  const lapsedAt = Date.parse('2026-11-30T21:00:00Z');   // 15 h before `now` (valid through 30 Nov Riyadh time)
  const facility = (type = 'hospital') => ({ id: 'hosp-1', type, account_id: 'acc-h', user_id: 'usr-h', license_expiry_date: new Date('2026-11-30T00:00:00Z') });

  function run(profile: any, staff: any[], doctors: any[], appts: any[], at = now) {
    const queries: Array<[string, any]> = [];
    const emitted: any[] = [];
    const cursor = (rows: any[]) => ({ async *[Symbol.asyncIterator]() { for (const r of rows) yield r; }, toArray: async () => rows });
    const svc: any = Object.create(LegalEnterpriseService.prototype);
    svc.conn = { collection: (n: string) => ({ find: (q: any) => { queries.push([n, q]); return cursor(n === 'provider_accounts' ? staff : n === 'appointments' ? appts : q?.status === 'suspended' ? [profile] : doctors); } }) };
    svc.logger = { warn: jest.fn(), error: jest.fn() };
    svc.events = { emit: (n: string, p: any) => emitted.push([n, p]) };
    return svc.licenceLapseSweep(at).then((r: any) => ({ r, emitted, queries }));
  }
  const appt = (id: string, startMs: number) => ({ id, patient_id: `pat-${id}`, slot_start: new Date(startMs) });
  const STAFF = [{ id: 'a1', user_id: 'u1' }, { id: 'a2' }];
  const DOCTORS = [{ id: 'doc-1' }, { id: 'doc-2' }];

  it.each(['hospital', 'clinic'])('a lapsed %s: the facility\'s doctors are resolved (account -> profile id) and their CONFIRMED future visits asked for by the indexed doctor_id', async (type) => {
    const { queries } = await run(facility(type), STAFF, DOCTORS, []);
    const [, accountsQ] = queries.find(([n]) => n === 'provider_accounts') as any;
    expect(accountsQ).toEqual({ facility_id: { $in: ['acc-h', 'usr-h'] } });
    const doctorsQ = queries.filter(([n, q]) => n === 'provider_profiles' && q.type === 'doctor')[0][1];
    expect(doctorsQ.$or).toEqual([{ account_id: { $in: ['a1', 'u1', 'a2'] } }, { user_id: { $in: ['a1', 'u1', 'a2'] } }]);
    const [, apptQ] = queries.find(([n]) => n === 'appointments') as any;
    expect(apptQ).toMatchObject({ doctor_id: { $in: ['doc-1', 'doc-2'] }, status: 'CONFIRMED', slot_start: { $gt: new Date(now) } });
  });

  it('a far visit is sent (kind appointment, the facility as the provider); the visit in 3 h is kept while the licence lapsed 15 h ago; sent once the lapse is 25 h old', async () => {
    expect(lapsedAt).toBe(now - 15 * H);
    const first = await run(facility(), STAFF, DOCTORS, [appt('far', now + 3 * 24 * H), appt('soon', now + 3 * H)]);
    expect(first.r).toEqual({ profiles: 1, cancel_requested: 1 });
    expect(first.emitted).toEqual([[LICENCE_LAPSE_CANCEL_EVENT, { kind: 'appointment', booking_id: 'far', patient_id: 'pat-far', provider_profile_id: 'hosp-1', lapse_at: new Date(lapsedAt).toISOString() }]]);
    const later = lapsedAt + 25 * H;
    const second = await run(facility(), STAFF, DOCTORS, [appt('soon', later + 3 * H)], later);
    expect(second.emitted.map((e) => e[1].booking_id)).toEqual(['soon']);
  });

  it('a facility with no staff, or whose staff include no doctor, asks for no appointments at all', async () => {
    for (const [staff, doctors] of [[[], DOCTORS], [STAFF, []]] as const) {
      const { r, queries } = await run(facility(), staff as any[], doctors as any[], [appt('far', now + 3 * 24 * H)]);
      expect(r).toEqual({ profiles: 1, cancel_requested: 0 });
      expect(queries.some(([n]) => n === 'appointments')).toBe(false);
    }
  });

  it('the profile filter selects hospital and clinic providers too', async () => {
    const { queries } = await run(facility(), [], [], []);
    const [, pq] = queries.find(([n, q]) => n === 'provider_profiles' && q.status === 'suspended') as any;
    expect(pq.type.$in).toEqual(expect.arrayContaining(['hospital', 'clinic', 'doctor']));
  });
});
