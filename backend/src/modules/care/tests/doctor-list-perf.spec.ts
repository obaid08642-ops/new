import { CareService } from '../care.service';

/**
 * Q41 (performance): the doctor list must not N+1 per-doctor availability
 * scans. `next_available_at` / `available_today` come from three batched
 * range reads (appointments, leaves, schedule slots); the per-doctor
 * SlotService probes must stay untouched by the list path.
 */
describe('CareService.listDoctors batched availability (Q41)', () => {
  const cardFields = {
    display_name_ar: 'طبيب', specialty: 'cardiology', city: 'الرياض',
    consultation_modes: ['clinic'], price_clinic: 100,
    rating_avg: 4.5, rating_count: 10,
  };

  function setup(docs: any[], rows: Record<string, any[]> = {}) {
    const collectionCalls: string[] = [];
    const findCalls: { filter: any; projection: any }[] = [];
    const db = {
      collection: jest.fn((name: string) => {
        collectionCalls.push(name);
        return {
          find: jest.fn(() => ({
            toArray: jest.fn().mockResolvedValue(rows[name] || []),
          })),
        };
      }),
    };
    const providers: any = {
      countDocuments: jest.fn().mockResolvedValue(docs.length),
      find: jest.fn((filter: any, projection: any) => {
        findCalls.push({ filter, projection });
        return { sort: jest.fn(() => ({ limit: jest.fn().mockResolvedValue(docs) })) };
      }),
      db,
    };
    const slots: any = {
      nextAvailable: jest.fn().mockResolvedValue('should-not-be-called'),
      hasSlotsToday: jest.fn().mockResolvedValue(true),
      slotsForDate: jest.fn(),
    };
    const service = new CareService(providers, {} as any, {} as any, slots);
    return { providers, slots, service, collectionCalls, findCalls };
  }

  const openAllDay = (over: any = {}) => ({
    id: 'doc-a', account_id: 'acc-a', user_id: 'user-a',
    working_hours: [{ day: 'all', open: '00:00', close: '23:59' }],
    ...cardFields, ...over,
  });

  it('computes next_available_at from batched reads without per-doctor slot probes', async () => {
    const docs = [openAllDay(), openAllDay({ id: 'doc-b', consultation_modes: [] })];
    const { service, slots, collectionCalls, findCalls } = setup(docs);

    const result = await service.listDoctors({ limit: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].next_available_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.items[1].next_available_at).toBeNull();
    // Response shape unchanged.
    expect(result).toMatchObject({ page: 1, limit: 20, total: 2, total_is_exact: true });
    expect(result.items[0]).toMatchObject({ id: 'doc-a', specialty: 'cardiology' });
    // No N+1: the per-doctor probes are never called by the list path.
    expect(slots.nextAvailable).not.toHaveBeenCalled();
    expect(slots.hasSlotsToday).not.toHaveBeenCalled();
    // Bounded reads: exactly the three batched collections.
    expect(collectionCalls.sort()).toEqual(['appointments', 'leaverequests', 'provider_schedule_slots']);
    // Projection: heavy/private blobs stay out of the list read.
    expect(findCalls[0].projection).toMatchObject({
      license_documents: 0,
      insurance_contracts: 0,
      verification_logs: 0,
      registration_steps: 0,
      doctors_roster: 0,
    });
  });

  it('marks booked slots unavailable from the batched appointments read', async () => {
    const docs = [openAllDay()];
    // First 30-min boundary at/after now+15min is the expected first slot; book it.
    const now = Date.now();
    const midnight = new Date(now);
    midnight.setUTCHours(0, 0, 0, 0);
    let t = midnight.getTime();
    while (t < now + 15 * 60_000) t += 30 * 60_000;
    const bookedIso = new Date(t).toISOString();
    const nextIso = new Date(t + 30 * 60_000).toISOString();
    const { service } = setup(docs, {
      appointments: [{ doctor_id: 'doc-a', slot_start: new Date(t) }],
    });

    const result = await service.listDoctors({ limit: 20 });

    expect(result.items[0].next_available_at).toBe(nextIso);
    expect(result.items[0].next_available_at).not.toBe(bookedIso);
  });

  it('filters available_today from the batched day-0 scan without per-doctor probes', async () => {
    const docs = [openAllDay(), openAllDay({ id: 'doc-closed', working_hours: [] })];
    const { service, slots } = setup(docs);

    const result = await service.listDoctors({ limit: 20, available_today: true });

    expect(result.items.map((d: any) => d.id)).toEqual(['doc-a']);
    expect(result.total_is_exact).toBe(false);
    expect(slots.hasSlotsToday).not.toHaveBeenCalled();
    expect(slots.nextAvailable).not.toHaveBeenCalled();
  });

  it('falls back to the per-doctor path when raw collections are unreachable', async () => {
    const docs = [openAllDay()];
    const providers: any = {
      countDocuments: jest.fn().mockResolvedValue(1),
      find: jest.fn(() => ({ sort: jest.fn(() => ({ limit: jest.fn().mockResolvedValue(docs) })) })),
    };
    const slots: any = {
      nextAvailable: jest.fn().mockResolvedValue('2026-10-03T09:00:00.000Z'),
      hasSlotsToday: jest.fn().mockResolvedValue(true),
      slotsForDate: jest.fn(),
    };
    const service = new CareService(providers, {} as any, {} as any, slots);

    const result = await service.listDoctors({ limit: 20 });

    expect(result.items[0].next_available_at).toBe('2026-10-03T09:00:00.000Z');
    expect(slots.nextAvailable).toHaveBeenCalledTimes(1);
  });
});
