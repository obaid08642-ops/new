/**
 * 15.9 — Clocks and time zones: Ramadan + holiday hours in provider schedules.
 *
 * SlotService.hoursFor() precedence (pinned here):
 *   special_hours (exact YYYY-MM-DD) > approved slots > ramadan_hours
 *   (while the date is in Ramadan) > per-mode schedule > working_hours.
 * A malformed special entry falls through to normal hours — it must never
 * strand a provider open wrongly or closed wrongly.
 *
 * Dates are all in 2027 (future, so the 15-min lead-time filter cannot eat
 * them): 2027-02-15 is 8 Ramadan 1448 (Monday); 2027-06-01 is an ordinary
 * Tuesday; 2027-06-10/11/12 carry special-hour entries.
 *
 * Reverting the ramadan branch makes the Ramadan test serve 09:00 slots;
 * reverting the special branch reopens Eid. Both fail loudly.
 */
import { SlotService } from './slot.service';
import { CareService } from './care.service';

const doctorWith = (extra: any = {}) => ({
  id: 'doc-1',
  consultation_modes: ['clinic'],
  working_hours: [{ day: 'all', open: '09:00', close: '17:00' }],
  ramadan_hours: [{ day: 'all', open: '10:30', close: '14:30' }],
  special_hours: [
    { date: '2027-06-10', closed: true, reason: 'Eid al-Adha' },
    { date: '2027-06-11', open: '12:00', close: '16:00', reason: 'catch-up clinic' },
    { date: '2027-06-12', open: 'xx', close: 'yy', reason: 'malformed — ignored' },
  ],
  ...extra,
});

const svc = () => new SlotService(
  { find: jest.fn(() => ({ select: jest.fn(() => ({ lean: jest.fn(async () => []) })) })) } as any,
  {} as any,
);

describe('15.9 Ramadan and holiday hours (mocked repositories)', () => {
  it('serves Ramadan hours during Ramadan, normal hours otherwise', async () => {
    const s = svc();
    const ramadan = await s.slotsForDate(doctorWith() as any, '2027-02-15', 'clinic');
    expect(ramadan.slots.length).toBeGreaterThan(0);
    expect(ramadan.slots[0].start).toContain('T10:30:00.000Z');
    for (const slot of ramadan.slots) {
      expect(slot.start.substring(11, 16) >= '10:30').toBe(true);
      expect(slot.end.substring(11, 16) <= '14:30').toBe(true);
    }
    const normal = await s.slotsForDate(doctorWith() as any, '2027-06-01', 'clinic');
    expect(normal.slots.length).toBeGreaterThan(0);
    expect(normal.slots[0].start).toContain('T09:00:00.000Z');
  });

  it('closes the provider on a holiday special date', async () => {
    const out = await svc().slotsForDate(doctorWith() as any, '2027-06-10', 'clinic');
    expect(out).toEqual({ date: '2027-06-10', service_type: 'clinic', slots: [], reason: 'closed' });
  });

  it('opens special open/close windows on a catch-up date', async () => {
    const out = await svc().slotsForDate(doctorWith() as any, '2027-06-11', 'clinic');
    expect(out.slots.length).toBeGreaterThan(0);
    expect(out.slots[0].start).toContain('T12:00:00.000Z');
    for (const slot of out.slots) {
      expect(slot.end.substring(11, 16) <= '16:00').toBe(true);
    }
  });

  it('ignores a malformed special entry and serves normal hours', async () => {
    const out = await svc().slotsForDate(doctorWith() as any, '2027-06-12', 'clinic');
    expect(out.slots.length).toBeGreaterThan(0);
    expect(out.slots[0].start).toContain('T09:00:00.000Z');
  });

  it('a provider without Ramadan/special fields keeps legacy hours in Ramadan', async () => {
    const plain = { id: 'doc-2', consultation_modes: ['clinic'], working_hours: [{ day: 'all', open: '09:00', close: '17:00' }] };
    const out = await svc().slotsForDate(plain as any, '2027-02-15', 'clinic');
    expect(out.slots.length).toBeGreaterThan(0);
    expect(out.slots[0].start).toContain('T09:00:00.000Z');
  });

  it('far-future slot selection is identical with the server clock ±1 day', async () => {
    jest.useFakeTimers();
    try {
      const s = svc();
      const doc = doctorWith() as any;
      const ids = async (dateStr: string) =>
        (await s.slotsForDate(doc, dateStr, 'clinic')).slots.map((x: any) => x.id);
      // Ordinary week: target 5 days out, server shifted ±1 day around it.
      jest.setSystemTime(new Date('2027-05-20T12:00:00Z'));
      const base = await ids('2027-05-25');
      expect(base.length).toBeGreaterThan(0);
      jest.setSystemTime(new Date('2027-05-21T12:00:00Z')); // server +1 day
      expect(await ids('2027-05-25')).toEqual(base);
      jest.setSystemTime(new Date('2027-05-19T12:00:00Z')); // server −1 day
      expect(await ids('2027-05-25')).toEqual(base);
      // Ramadan week: same stability for Ramadan-hour slots.
      jest.setSystemTime(new Date('2027-02-10T12:00:00Z'));
      const ramadanBase = await ids('2027-02-15');
      expect(ramadanBase.length).toBeGreaterThan(0);
      jest.setSystemTime(new Date('2027-02-11T12:00:00Z')); // server +1 day
      expect(await ids('2027-02-15')).toEqual(ramadanBase);
      jest.setSystemTime(new Date('2027-02-09T12:00:00Z')); // server −1 day
      expect(await ids('2027-02-15')).toEqual(ramadanBase);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('15.9 doctor list mirrors holiday closures (mocked CareService deps)', () => {
  it('available_today drops a provider closed by special_hours today', async () => {
    // Pin midday so the control doctor deterministically has slots left
    // (independent of the wall-clock hour the suite happens to run at).
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-10-05T12:00:00Z'));
      const todayStr = new Date().toISOString().substring(0, 10);
      const card = { display_name_ar: 'طبيب', specialty: 'cardiology', city: 'الرياض', consultation_modes: ['clinic'], price_clinic: 100, rating_avg: 4.5, rating_count: 10 };
      const docs = [
        { id: 'doc-open', working_hours: [{ day: 'all', open: '00:00', close: '23:59' }], ...card },
        { id: 'doc-eid', working_hours: [{ day: 'all', open: '00:00', close: '23:59' }], special_hours: [{ date: todayStr, closed: true, reason: 'holiday' }], ...card },
      ];
      const db = {
        collection: jest.fn(() => ({ find: jest.fn(() => ({ toArray: jest.fn(async () => []) })) })),
      };
      const providers: any = {
        countDocuments: jest.fn(async () => docs.length),
        find: jest.fn(() => ({ sort: jest.fn(() => ({ limit: jest.fn(async () => docs) })) })),
        db,
      };
      const slots: any = { nextAvailable: jest.fn(), hasSlotsToday: jest.fn(), slotsForDate: jest.fn() };
      const service = new CareService(providers, {} as any, {} as any, slots);
      const result = await service.listDoctors({ limit: 20, available_today: true });
      expect(result.items.map((d: any) => d.id)).toEqual(['doc-open']);
      // The list path replays hours in memory — no per-doctor probes.
      expect(slots.hasSlotsToday).not.toHaveBeenCalled();
      expect(slots.nextAvailable).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
