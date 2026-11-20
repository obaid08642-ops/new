import { LegalEnterpriseService } from './legal-enterprise.service';
import { LICENCE_LAPSE_CANCEL_EVENT } from '../../common/licence-lapse-cancel';

/** D2: the hourly sweep names the confirmed FUTURE visits of a provider whose licence lapsed; the owning module cancels (and refunds) each one. */
describe('licence lapse sweep (D2)', () => {
  const H = 3600_000;
  const now = Date.parse('2026-12-01T12:00:00Z');
  const lapseDay = '2026-11-30';                       // valid through the end of 30 Nov (Riyadh), lapsed from 00:00 on 1 Dec (Riyadh) = 2026-11-30T21:00Z
  const lapsedAt = Date.parse('2026-11-30T21:00:00Z');   // 15 h before `now`
  const profile = (over: Record<string, unknown> = {}) => ({ id: 'doc-1', type: 'doctor', license_expiry_date: new Date(`${lapseDay}T00:00:00Z`), ...over });

  function run(profiles: any[], appts: any[], at = now, only?: string) {
    const queries: any[] = [];
    const iter = (rows: any[]) => ({ async *[Symbol.asyncIterator]() { for (const r of rows) yield r; } });
    const svc: any = Object.create(LegalEnterpriseService.prototype);
    svc.conn = { collection: (n: string) => ({ find: (q: any) => { queries.push([n, q]); return iter(n === 'provider_profiles' ? profiles : only && n !== only ? [] : appts); } }) };
    svc.logger = { warn: jest.fn(), error: jest.fn() };
    const emitted: any[] = [];
    svc.events = { emit: (n: string, p: any) => emitted.push([n, p]) };
    return svc.licenceLapseSweep(at).then((r: any) => ({ r, emitted, queries }));
  }
  const appt = (id: string, startMs: number) => ({ id, patient_id: `pat-${id}`, slot_start: new Date(startMs) });

  it('a visit far in the future is sent for cancellation; one starting in 3 h is kept (the licence lapsed 15 h ago)', async () => {
    expect(lapsedAt).toBe(now - 15 * H);
    const { r, emitted } = await run([profile()], [appt('far', now + 3 * 24 * H), appt('soon', now + 3 * H)]);
    expect(r).toEqual({ profiles: 1, cancel_requested: 1 });
    expect(emitted).toEqual([[LICENCE_LAPSE_CANCEL_EVENT, { kind: 'appointment', booking_id: 'far', patient_id: 'pat-far', provider_profile_id: 'doc-1', lapse_at: new Date(lapsedAt).toISOString() }]]);
  });

  it('once the licence lapsed 24 h ago or more, the visit starting in 3 h goes too', async () => {
    const later = lapsedAt + 25 * H;
    const { emitted } = await run([profile()], [appt('soon', later + 3 * H)], later);
    expect(emitted.map((e) => e[1].booking_id)).toEqual(['soon']);
  });

  it('a renewed licence (the stored date moved to the future) is skipped, and only the confirmed future visits of the lapsed doctor are asked for', async () => {
    const renewed = await run([profile({ license_expiry_date: new Date('2027-06-01T00:00:00Z') })], [appt('far', now + 3 * 24 * H)]);
    expect(renewed.r).toEqual({ profiles: 0, cancel_requested: 0 });
    expect(renewed.emitted).toEqual([]);
    const { queries } = await run([profile()], []);
    const [, q] = queries.find(([n]) => n === 'appointments');
    expect(q).toMatchObject({ doctor_id: 'doc-1', status: 'CONFIRMED', slot_start: { $gt: new Date(now) } });
    const [, pq] = queries.find(([n]) => n === 'provider_profiles');
    expect(pq).toMatchObject({ status: 'suspended', suspended_reason: 'license_expired' });
    expect(pq.type.$in).toContain('doctor');
  });
  it('labs and radiology (D2 part 2): the lab / radiology bookings of the provider ACCOUNT, CONFIRMED and in the future, are sent with their kind; the same 24 h rule applies', async () => {
    for (const [type, collection, kind] of [['lab', 'labbookings', 'lab'], ['radiology', 'radiologybookings', 'radiology']] as const) {
      const rows = [{ id: 'far', patient_id: 'p1', scheduled_at: new Date(now + 3 * 24 * H) }, { id: 'soon', patient_id: 'p2', scheduled_at: new Date(now + 3 * H) }];
      const { r, emitted, queries } = await run([profile({ id: `${type}-1`, type, account_id: 'acc-1', user_id: 'usr-1' })], rows, now, collection);
      expect(r).toEqual({ profiles: 1, cancel_requested: 1 });
      expect(emitted.map((e) => [e[1].kind, e[1].booking_id, e[1].provider_profile_id])).toEqual([[kind, 'far', `${type}-1`]]);
      const [, q] = queries.find(([n]) => n === collection);
      expect(q).toMatchObject({ provider_account_id: { $in: ['acc-1', 'usr-1'] }, state: 'CONFIRMED', scheduled_at: { $gt: new Date(now) } });
    }
  });

  it('only the provider types with a booking kind are selected', async () => {
    const { queries } = await run([], []);
    const [, pq] = queries.find(([n]) => n === 'provider_profiles');
    expect(pq.type.$in.sort()).toEqual(['clinic', 'doctor', 'home_care', 'hospital', 'lab', 'nurse', 'nursing', 'pharmacy', 'radiology']);
  });
  it('home care (D2 part 3): nurse / nursing / home_care providers; the booking\'s provider_id is the ACCOUNT id; CONFIRMED or PROVIDER_ASSIGNED and in the future; same 24 h rule', async () => {
    for (const type of ['home_care', 'nursing', 'nurse']) {
      const rows = [{ id: 'far', patient_id: 'p1', scheduled_at: new Date(now + 3 * 24 * H) }, { id: 'soon', patient_id: 'p2', scheduled_at: new Date(now + 3 * H) }];
      const { r, emitted, queries } = await run([profile({ id: `${type}-1`, type, account_id: 'acc-1', user_id: 'usr-1' })], rows, now, 'homecarebookings');
      expect(r).toEqual({ profiles: 1, cancel_requested: 1 });
      expect(emitted.map((e) => [e[1].kind, e[1].booking_id])).toEqual([['home_care', 'far']]);
      const [, q] = queries.find(([n]) => n === 'homecarebookings');
      expect(q).toMatchObject({ provider_id: { $in: ['acc-1', 'usr-1'] }, state: { $in: ['CONFIRMED', 'PROVIDER_ASSIGNED'] }, scheduled_at: { $gt: new Date(now) } });
    }
  });
  it('pharmacy (D2 part 4): the allocations of the pharmacy ACCOUNT it has not started have no schedule, so they are kept for the first 24 h after the lapse and sent after that', async () => {
    const rows = [{ id: 'al1', patient_id: 'p1' }, { id: 'al2', patient_id: 'p2' }];
    const prof = profile({ id: 'ph-1', type: 'pharmacy', account_id: 'acc-ph', user_id: 'usr-ph' });
    const within = await run([prof], rows);                      // lapsed 15 h ago: grace
    expect(within.r).toEqual({ profiles: 1, cancel_requested: 0 });
    const after = await run([prof], rows, lapsedAt + 25 * H);    // lapsed 25 h ago
    expect(after.r).toEqual({ profiles: 1, cancel_requested: 2 });
    expect(after.emitted.map((e) => [e[1].kind, e[1].booking_id, e[1].provider_profile_id])).toEqual([['pharmacy_allocation', 'al1', 'ph-1'], ['pharmacy_allocation', 'al2', 'ph-1']]);
    const [, q] = after.queries.find(([n]) => n === 'pharmacy_allocations');
    expect(q).toEqual({ pharmacy_account_id: { $in: ['acc-ph', 'usr-ph'] }, status: { $in: ['pending_review', 'partially_confirmed', 'confirmed'] } });
  });
  it('radiology CENTRE bookings (the older system, no schedule): the centre is an ObjectId, ACCEPTED / CONFIRMED, kept for the first 24 h after the lapse and sent after that', async () => {
    const { Types } = require('mongoose');
    const accountId = new Types.ObjectId().toHexString();
    const prof = profile({ id: 'rad-1', type: 'radiology', account_id: accountId, user_id: 'not-an-object-id' });
    const rows = [{ id: 'c1', patient_id: new Types.ObjectId() }];
    const within = await run([prof], rows, now, 'radiologycenterbookings');
    expect(within.r).toEqual({ profiles: 1, cancel_requested: 0 });
    const after = await run([prof], rows, lapsedAt + 25 * H, 'radiologycenterbookings');
    expect(after.r).toEqual({ profiles: 1, cancel_requested: 1 });
    expect(after.emitted[0][1]).toMatchObject({ kind: 'radiology_center', booking_id: 'c1', provider_profile_id: 'rad-1' });
    expect(typeof after.emitted[0][1].patient_id).toBe('string');
    const [, q] = after.queries.find(([n]) => n === 'radiologycenterbookings');
    expect(q.status).toEqual({ $in: ['ACCEPTED', 'CONFIRMED'] });
    expect(q.radiology_center_id.$in).toHaveLength(1);                    // only the id that is a real ObjectId is matched
    expect(String(q.radiology_center_id.$in[0])).toBe(accountId);
  });

  it('a radiology provider is swept in BOTH of its booking systems (ops bookings and centre bookings)', async () => {
    const { queries } = await run([profile({ id: 'rad-1', type: 'radiology', account_id: 'acc-1' })], []);
    expect(queries.map(([n]) => n).filter((n) => n !== 'provider_profiles').sort()).toEqual(['radiologybookings', 'radiologycenterbookings']);
  });
});
