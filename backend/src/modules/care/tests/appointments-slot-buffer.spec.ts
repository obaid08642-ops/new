/**
 * Q37 — slot-listing buffer parity (listed-available implies bookable).
 * create() pads the NEW appointment by 5 min and 409s with
 * slot_already_booked_or_conflicts_with_buffer when an existing booking starts
 * inside that padded window (e.g. booking 16:30 while 17:00–17:30 exists).
 * The listing path (SlotService, via ./availability) applies the IDENTICAL rule,
 * so a slot the list marks available can actually be booked. Mocked models, no DB.
 * Q36 (slot holds) is untouched — see appointments-slot-hold.spec.ts.
 */
import { ConflictException } from '@nestjs/common';
import { AppointmentsService } from '../appointments.service';
import { appointmentRanges, bookingConflicts } from '../availability';

// The listing side of the one rule (./availability), as SlotService applies it.
const isSlotListAvailable = (start: Date, bookings: any[], dur: number) => !bookingConflicts(start.getTime(), dur, appointmentRanges(bookings, dur));
const markSlotsAvailability = (cands: { start: Date }[], bookings: any[], dur: number) =>
  cands.map((c) => ({ start: new Date(c.start).toISOString(), available: isSlotListAvailable(new Date(c.start), bookings, dur) }));

const makeDoc = (obj: any) => {
  const doc: any = { state_history: [], symptoms: [], ...obj };
  doc.save = jest.fn().mockResolvedValue(doc);
  doc.toObject = () => ({ ...doc });
  return doc;
};

/** Future day at an exact HH:MM UTC (always a 15-min boundary when mm % 15 === 0). */
const dayAt = (daysOut: number, hh: number, mm: number) => {
  const d = new Date(Date.now() + daysOut * 86400000);
  d.setUTCHours(hh, mm, 0, 0);
  if (d.getTime() < Date.now() + 10 * 60_000) d.setTime(d.getTime() + 86400000);
  return d;
};

describe('AppointmentsService slot-listing buffer parity (Q37)', () => {
  let service: AppointmentsService;
  let apptModel: any;
  let providerModel: any;
  let connection: any;
  let events: any;
  let engine: any;
  let insurance: any;

  const doctor: any = {
    id: 'doc-1',
    user_id: 'doc-user-1',
    account_id: 'doc-account-1',
    type: 'doctor',
    status: 'active',
    consultation_modes: ['clinic'],
    price_clinic: 200,
  };

  /** Existing blocking bookings (17:00–17:30 CONFIRMED), as the listing path receives them. */
  const pmAt = (hh: number, mm: number) => dayAt(3, hh, mm);
  const existingBookings = () => [
    { slot_start: pmAt(17, 0), slot_end: pmAt(17, 30), status: 'CONFIRMED' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apptModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    providerModel = { findOne: jest.fn().mockResolvedValue(doctor) };
    connection = {
      model: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }),
      db: { collection: jest.fn() },
      collection: jest.fn(),
    };
    events = { emit: jest.fn() };
    engine = {
      apply: jest.fn(async (opts: any) => opts.mutate()),
      announceCreated: jest.fn().mockResolvedValue({}),
    };
    insurance = { createRequest: jest.fn() };
    service = new AppointmentsService(
      apptModel, providerModel, connection, events, engine, insurance,
    );
  });

  /**
   * Emulates the real Mongo overlap predicate of create() over the given
   * bookings; routes id-reads (transition + refreshed) to the created doc.
   */
  const wireOverlapQuery = (bookings: any[], createdRef: { doc: any }) => {
    apptModel.findOne.mockImplementation(async (q: any) => {
      if (q?.status?.$in) {
        if (!q.slot_start?.$lt || !q.slot_end?.$gt) return null;
        const lt = new Date(q.slot_start.$lt).getTime();
        const gt = new Date(q.slot_end.$gt).getTime();
        return (
          bookings.find(
            (b) =>
              q.status.$in.includes(b.status) &&
              new Date(b.slot_start).getTime() < lt &&
              new Date(b.slot_end).getTime() > gt,
          ) || null
        );
      }
      if (q?.id) return createdRef.doc;
      return null;
    });
    apptModel.create.mockImplementation(async (doc: any) => {
      createdRef.doc = makeDoc({ id: 'appt-1', ...doc });
      return createdRef.doc;
    });
  };

  const bookBody = (slot: Date) => ({
    doctor_id: 'doc-1',
    service_type: 'clinic' as const,
    slot_start: slot.toISOString(),
  });

  it('(1) 16:30 is listed UNAVAILABLE when a 17:00–17:30 booking follows (the reported 409)', () => {
    // Candidate 16:30–17:00 pads to 17:05; booking starts 17:00 < 17:05 → conflict.
    expect(isSlotListAvailable(pmAt(16, 30), existingBookings(), 30)).toBe(false);
    const marked = markSlotsAvailability(
      [{ start: pmAt(16, 30) }, { start: pmAt(15, 0) }],
      existingBookings(),
      30,
    );
    expect(marked).toEqual([
      { start: pmAt(16, 30).toISOString(), available: false },
      { start: pmAt(15, 0).toISOString(), available: true },
    ]);
  });

  it('(2) strict-inequality parity: a candidate padding to exactly the next booking start stays available', () => {
    // 16:30 + 25 min = 16:55, padded to exactly 17:00; booking starts 17:00 —
    // NOT < paddedEnd, so no conflict (mirrors create()'s `$lt` exactly).
    expect(isSlotListAvailable(pmAt(16, 30), existingBookings(), 25)).toBe(true);
    // ...while the standard 30-min slot pads past it and conflicts.
    expect(isSlotListAvailable(pmAt(16, 30), existingBookings(), 30)).toBe(false);
  });

  it('(3) a slot the list marks available can be booked (mocked create succeeds)', async () => {
    const bookings = existingBookings();
    const candidates = [{ start: pmAt(16, 30) }, { start: pmAt(15, 0) }];
    const marked = markSlotsAvailability(candidates, bookings, 30);
    const free = marked.filter((s) => s.available);
    expect(free).toHaveLength(1);

    const createdRef: { doc: any } = { doc: null };
    wireOverlapQuery(bookings, createdRef);
    const res: any = await service.create({ id: 'pat-1', role: 'patient' }, bookBody(new Date(free[0].start)));
    expect(res.id).toBe('appt-1');
    expect(new Date(res.slot_start).toISOString()).toBe(free[0].start);
  });

  it('(4) a slot the list marks unavailable is refused by booking with the buffer conflict', async () => {
    const bookings = existingBookings();
    expect(isSlotListAvailable(pmAt(16, 30), bookings, 30)).toBe(false);

    const createdRef: { doc: any } = { doc: null };
    wireOverlapQuery(bookings, createdRef);
    let err: any = null;
    try {
      await service.create({ id: 'pat-1', role: 'patient' }, bookBody(pmAt(16, 30)));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConflictException);
    expect(err?.message).toBe('slot_already_booked_or_conflicts_with_buffer');
    expect(apptModel.create).not.toHaveBeenCalled();
  });
});
