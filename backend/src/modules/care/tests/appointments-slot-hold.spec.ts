/**
 * Q36 — booking integrity vs slot holds.
 * Proves the appointment-booking path refuses a slot another patient
 * actively holds (409 slot_held), while the holder can still book inside
 * their own hold and expired holds never block.
 */
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { AppointmentsService } from '../appointments.service';

const makeDoc = (obj: any) => {
  const doc: any = { state_history: [], symptoms: [], ...obj };
  doc.save = jest.fn().mockResolvedValue(doc);
  doc.toObject = () => ({ ...doc });
  return doc;
};

const futureQuarterHour = () => {
  const d = new Date(Date.now() + 72 * 3600000);
  d.setUTCMinutes(Math.ceil((d.getUTCMinutes() + 1) / 15) * 15, 0, 0);
  return d;
};

describe('AppointmentsService slot-hold integrity (Q36)', () => {
  let service: AppointmentsService;
  let apptModel: any;
  let providerModel: any;
  let connection: any;
  let slotLockFindOne: jest.Mock;
  let events: any;
  let engine: any;
  let insurance: any;
  let locks: any;

  const doctor: any = {
    id: 'doc-1',
    user_id: 'doc-user-1',
    account_id: 'doc-account-1',
    type: 'doctor',
    status: 'active',
    consultation_modes: ['clinic'],
    price_clinic: 200,
  };

  const bookBody = (slot: Date, extra: any = {}) => ({
    doctor_id: 'doc-1',
    service_type: 'clinic' as const,
    slot_start: slot.toISOString(),
    ...extra,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    slotLockFindOne = jest.fn();
    apptModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    providerModel = { findOne: jest.fn().mockResolvedValue(doctor) };
    connection = {
      model: jest.fn().mockReturnValue({ findOne: slotLockFindOne }),
      db: { collection: jest.fn() },
      collection: jest.fn(),
    };
    events = { emit: jest.fn() };
    engine = {
      apply: jest.fn(async (opts: any) => opts.mutate()),
      announceCreated: jest.fn().mockResolvedValue({}),
    };
    insurance = { createRequest: jest.fn() };
    locks = {
      validateForBooking: jest.fn().mockResolvedValue({ id: 'lock-A' }),
      confirm: jest.fn().mockResolvedValue({}),
      releaseQuietly: jest.fn().mockResolvedValue({ ok: true }),
    };
    service = new AppointmentsService(
      apptModel, providerModel, connection, events, engine, insurance, locks,
    );
  });

  /** Overlap check empty; refreshed read + transition read return the created doc. */
  const wireSuccessfulBooking = () => {
    let created: any = null;
    apptModel.create.mockImplementation(async (doc: any) => {
      created = makeDoc({ id: 'appt-1', ...doc });
      return created;
    });
    apptModel.findOne.mockImplementation(async (q: any) => {
      if (q?.status?.$in) return null; // no overlapping appointment
      if (q?.id === 'appt-1') return created;
      return null;
    });
  };

  it('(1) B without a lock is refused 409 slot_held while A\'s hold is active', async () => {
    slotLockFindOne.mockResolvedValue({
      id: 'lock-A', patient_id: 'pat-A', provider_id: 'doc-1',
      status: 'held', expires_at: new Date(Date.now() + 9 * 60_000),
    });
    apptModel.findOne.mockResolvedValue(null);

    let err: any = null;
    try {
      await service.create({ id: 'pat-B', role: 'patient' }, bookBody(futureQuarterHour()));
    } catch (e) { err = e; }
    expect(err).toBeInstanceOf(ConflictException);
    expect(err?.message).toBe('slot_held');
    expect(err?.getStatus?.()).toBe(409);
    expect(apptModel.create).not.toHaveBeenCalled();

    // The hold lookup targets this provider+slot, held-only, unexpired-only,
    // and excludes the booker — so foreign active holds match, own do not.
    const q = slotLockFindOne.mock.calls[0][0];
    expect(q.provider_id).toBe('doc-1');
    expect(q.status).toBe('held');
    expect(q.expires_at?.$gt instanceof Date).toBe(true);
    expect(q.slot_start?.$lt instanceof Date).toBe(true);
    expect(q.slot_end?.$gt instanceof Date).toBe(true);
    expect(q.patient_id?.$nin).toContain('pat-B');
  });

  it('(2) A can still book inside its own hold (lock consumed on success)', async () => {
    // DB-level exclusion of A's own lock: no foreign hold matches.
    slotLockFindOne.mockResolvedValue(null);
    wireSuccessfulBooking();

    const res: any = await service.create(
      { id: 'pat-A', role: 'patient' },
      bookBody(futureQuarterHour(), { slot_lock_id: 'lock-A' }),
    );
    expect(res.id).toBe('appt-1');
    expect(locks.validateForBooking).toHaveBeenCalled();
    expect(locks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pat-A' }), 'lock-A', 'appt-1',
    );
    // Own lock excluded from the foreign-hold check by construction.
    expect(slotLockFindOne.mock.calls[0][0].patient_id?.$nin).toContain('pat-A');
  });

  it('(3) an expired lock does not block B\'s booking', async () => {
    // An expired hold can no longer satisfy expires_at.$gt=now, so the
    // lookup finds nothing (mock mirrors the collection after TTL reap).
    slotLockFindOne.mockResolvedValue(null);
    wireSuccessfulBooking();

    const res: any = await service.create(
      { id: 'pat-B', role: 'patient' },
      bookBody(futureQuarterHour()),
    );
    expect(res.id).toBe('appt-1');
    const q = slotLockFindOne.mock.calls[0][0];
    expect(q.status).toBe('held');
    expect(q.expires_at?.$gt instanceof Date).toBe(true);
    expect(q.expires_at.$gt.getTime()).toBeLessThanOrEqual(Date.now() + 60_000);
  });
  it('(4) a failing hold lookup refuses the booking (fail closed, 503)', async () => {
    slotLockFindOne.mockRejectedValue(new Error('mongo down'));
    apptModel.findOne.mockResolvedValue(null);
    await expect(service.create({ id: 'pat-B', role: 'patient' }, bookBody(futureQuarterHour())))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(apptModel.create).not.toHaveBeenCalled();
  });

  it('(5) rescheduling into another patient\'s active hold is refused 409 slot_held', async () => {
    const original = makeDoc({
      id: 'appt-0', patient_id: 'pat-B', doctor_id: 'doc-1', doctor_user_id: 'doc-user-1',
      service_type: 'clinic', status: 'confirmed', duration_minutes: 30, price: 200,
    });
    apptModel.findOne.mockImplementation(async (q: any) => (q?.id === 'appt-0' ? original : null));
    slotLockFindOne.mockResolvedValue({
      id: 'lock-A', patient_id: 'pat-A', provider_id: 'doc-1',
      status: 'held', expires_at: new Date(Date.now() + 9 * 60_000),
    });
    await expect(service.reschedule('appt-0', { id: 'pat-B', role: 'patient' }, { slot_start: futureQuarterHour().toISOString() }))
      .rejects.toThrow('slot_held');
    expect(apptModel.create).not.toHaveBeenCalled();
    const q = slotLockFindOne.mock.calls[0][0];
    expect(q.provider_id).toBe('doc-1');
    expect(q.patient_id?.$nin).toEqual(expect.arrayContaining(['pat-B']));
  });
});
