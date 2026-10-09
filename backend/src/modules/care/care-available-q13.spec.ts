/** Q-13: available_within validation + online-video + scheduled scan (mocked). */
import { BadRequestException } from '@nestjs/common';
import { CareService } from './care.service';

const MIN = 60_000;

const svcWith = (docs: any[], opts: any = {}) => {
  const providerModel: any = {
    find: () => ({ sort: () => ({ limit: async () => docs }) }),
    countDocuments: async () => docs.length,
    db: {
      collection: (name: string) => {
        if (name === 'appointments') return { find: () => ({ toArray: async () => opts.bookings || [] }) };
        if (name === 'slotlocks') return { find: () => ({ toArray: async () => opts.holds || [] }) };
        if (name === 'provider_availability') {
          return { findOne: async (q: any) => (opts.online ? { _id: 1 } : null) };
        }
        if (name === 'provideravailability') return { findOne: async () => null };
        return { findOne: async () => null, find: () => ({ toArray: async () => [] }) };
      },
    },
  };
  const slots: any = {
    hasSlotsToday: async () => true,
    nextAvailable: async () => null,
    slotsForDate: async (doc: any) => ({
      slots: (opts.slots || []).map((s: number) => ({
        start: new Date(s).toISOString(), available: true,
      })),
    }),
  };
  return new (CareService as any)(providerModel, {}, {}, slots);
};

describe('Q-13 available now', () => {
  it('rejects non-positive whole minutes', async () => {
    const svc = svcWith([]);
    for (const bad of [0, -15, NaN, 7.5]) {
      await expect(svc.listDoctors({ available_within: bad, available_type: 'clinic' } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
  });

  it('online video doctor counts with next_slot_at = now', async () => {
    const svc = svcWith(
      [{ id: 'v1', consultation_modes: ['video'] }],
      { online: true },
    );
    const before = Date.now();
    const out: any = await svc.listDoctors({ available_within: 15, available_type: 'video' } as any);
    expect(out.items.map((d: any) => d.id)).toContain('v1');
    expect(Math.abs(Date.parse(out.items[0].next_slot_at) - before)).toBeLessThanOrEqual(2 * MIN);
  });

  it('scheduled free slot inside the window counts; booked-out doctor does not', async () => {
    const t0 = Date.now();
    const docs = [
      { id: 'free', consultation_modes: ['clinic'] },
      { id: 'busy', consultation_modes: ['clinic'] },
    ];
    const svc = svcWith(docs, {
      slots: [t0 + 30 * MIN],
      bookings: [{ doctor_id: 'busy', slot_start: new Date(t0 - MIN), slot_end: new Date(t0 + 3 * 60 * MIN) }],
    });
    const out: any = await svc.listDoctors({ available_within: 60, available_type: 'clinic' } as any);
    expect(out.items.map((d: any) => d.id)).toContain('free');
    expect(out.items.map((d: any) => d.id)).not.toContain('busy');
  });
});
