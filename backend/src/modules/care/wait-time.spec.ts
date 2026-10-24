import { averageWaitMinutes, MIN_WAIT_SAMPLES, waitMinutesOf } from './wait-time';
import { CareService } from './care.service';

const appt = (checkIn: string, start: string | null) => ({ state_history: [{ state: 'CONFIRMED', at: '2026-10-01T08:00:00Z' }, { state: 'CHECKED_IN', at: checkIn }, ...(start ? [{ state: 'IN_PROGRESS', at: start }] : []), { state: 'COMPLETED', at: '2026-10-01T12:00:00Z' }] });

describe('average clinic waiting time (check-in to start)', () => {
  it('one wait is the minutes from CHECKED_IN to IN_PROGRESS; missing, reversed or absurd ones do not count', () => {
    expect(waitMinutesOf(appt('2026-10-01T09:00:00Z', '2026-10-01T09:20:00Z').state_history)).toBe(20);
    expect(waitMinutesOf(appt('2026-10-01T09:00:00Z', null).state_history)).toBeNull();
    expect(waitMinutesOf(appt('2026-10-01T09:30:00Z', '2026-10-01T09:00:00Z').state_history)).toBeNull();
    expect(waitMinutesOf(appt('2026-10-01T00:00:00Z', '2026-10-01T11:00:00Z').state_history)).toBeNull();
    expect(waitMinutesOf(undefined)).toBeNull();
  });

  it(`nothing is shown below ${MIN_WAIT_SAMPLES} valid waits, a whole-minute average from then on`, () => {
    const four = Array.from({ length: 4 }, () => appt('2026-10-01T09:00:00Z', '2026-10-01T09:10:00Z'));
    expect(averageWaitMinutes(four)).toBeNull();
    // the fifth appointment has no start, so it is not a sample
    expect(averageWaitMinutes([...four, appt('2026-10-01T09:00:00Z', null)])).toBeNull();
    expect(averageWaitMinutes([...four, appt('2026-10-01T09:00:00Z', '2026-10-01T09:20:00Z')])).toBe(12);
  });

  it('the doctor detail carries avg_wait_minutes from completed clinic appointments only', async () => {
    const doc = { id: 'd1', user_id: 'u1', name_en: 'Dr', medical_review_status: 'approved', license_verified: true };
    const waits = Array.from({ length: 5 }, () => appt('2026-10-01T09:00:00Z', '2026-10-01T09:30:00Z'));
    let query: any;
    const providerModel: any = {
      findOne: async () => doc,
      find: () => ({ limit: () => Promise.resolve([]) }),
      db: { collection: (n: string) => ({ find: (q: any) => { if (n === 'appointments') query = q; return { toArray: async () => (n === 'appointments' ? waits : []), sort: () => ({ limit: () => ({ toArray: async () => (n === 'appointments' ? waits : []) }) }) }; } }) },
    };
    const svc: any = new (CareService as any)(providerModel, {}, { findOne: async () => null }, { nextAvailable: async () => null, hasSlotsToday: async () => false });
    const out = await svc.doctorById('d1');
    expect(out.avg_wait_minutes).toBe(30);
    expect(query).toMatchObject({ doctor_id: 'd1', status: 'COMPLETED', service_type: 'clinic' });
  });
});
