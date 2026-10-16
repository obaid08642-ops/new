import { SlotService } from '../slot.service';

// P14.3: nextAvailable reads the doctor's weekly hours, leave and bookings once for its 14 days (it was up to
// 3 queries per day), and must answer exactly what the day-by-day slotsForDate answers.
const chain = (v: any) => ({ select: () => ({ lean: () => Object.assign(Promise.resolve(v), { catch: () => Promise.resolve(v) }) }), lean: () => Promise.resolve(v) });
const day = (i: number) => new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);

function service(opts: { leaves: any[]; booked: Date[]; approved: any[] }) {
  const calls = { appt: 0, leaves: 0, schedule: 0 };
  const inRange = (q: any, d: Date) => (!q.$gte || d >= q.$gte) && (!q.$lt || d < q.$lt);
  const appt = { find: jest.fn((q: any) => { calls.appt++; return chain(opts.booked.filter((b) => inRange(q.slot_start, b)).map((slot_start) => ({ slot_start }))); }) };
  const overlaps = (q: any, l: any) => l.start_date < q.start_date.$lt && l.end_date >= q.end_date.$gte;
  const db = { collection: () => ({ find: (q: any) => { calls.schedule++; return { toArray: () => Promise.resolve(opts.approved.filter((x) => q.day_of_week === undefined || x.day_of_week === q.day_of_week)) }; } }) };
  const leaves = {
    db,
    findOne: jest.fn((q: any) => { calls.leaves++; return chain(opts.leaves.find((l) => overlaps(q, l)) || null); }),
    find: jest.fn((q: any) => { calls.leaves++; return chain(opts.leaves.filter((l) => overlaps(q, l))); }),
  };
  return { svc: new SlotService(appt as any, leaves as any), calls };
}

async function dayByDay(svc: SlotService, doctor: any) {
  for (let i = 0; i < 14; i++) {
    const r = await svc.slotsForDate(doctor, day(i), doctor.consultation_modes[0]);
    const s = r.slots.find((x) => x.available);
    if (s) return s.start;
  }
  return null;
}

describe('SlotService.nextAvailable (P14.3)', () => {
  const doctor: any = { id: 'd1', account_id: 'acc-1', user_id: 'u-1', consultation_modes: ['video'] };
  // approved video hours on two weekdays only, so several days are closed before the first open one
  const dows = [(new Date(Date.now() + 3 * 86_400_000).getUTCDay()), (new Date(Date.now() + 5 * 86_400_000).getUTCDay())];
  const approved = dows.map((d) => ({ provider_account_id: 'acc-1', day_of_week: d, start_time: '08:00', end_time: '09:00', service_type: 'video' }));

  it('answers like the day-by-day scan when the first open day is free', async () => {
    const a = service({ leaves: [], booked: [], approved });
    const b = service({ leaves: [], booked: [], approved });
    expect(await a.svc.nextAvailable(doctor)).toBe(await dayByDay(b.svc, doctor));
    expect(a.calls.appt + a.calls.leaves + a.calls.schedule).toBeLessThanOrEqual(3);
  });

  it('skips a day on leave and booked slots, like the day-by-day scan', async () => {
    const d3 = new Date(day(3) + 'T00:00:00Z');
    const d5 = new Date(day(5) + 'T08:00:00Z');
    const opts = { leaves: [{ start_date: d3, end_date: new Date(d3.getTime() + 3600_000) }], booked: [d5], approved };
    const a = service(opts);
    const b = service(opts);
    const got = await a.svc.nextAvailable(doctor);
    expect(got).toBe(await dayByDay(b.svc, doctor));
    expect(got).toBe(`${day(5)}T08:30:00.000Z`);
    expect(a.calls.appt + a.calls.leaves + a.calls.schedule).toBeLessThanOrEqual(3);
    expect(b.calls.appt + b.calls.leaves + b.calls.schedule).toBeGreaterThan(3); // the day-by-day scan: one hours query per day, more on open days
  });
});
