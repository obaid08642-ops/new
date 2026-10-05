/**
 * F1 — booking buffer-overlap race (mocked repositories, no mongod here).
 *
 * create() used to findOne-overlap then create while the unique index covers
 * only exact (doctor_id, slot_start): two concurrent overlapping-but-different
 * starts (10:00 vs 10:15 inside the 5-min buffer window) both read "free" and
 * both persisted. The fix claims the padded window atomically FIRST — one
 * hold document per request carrying every 1-minute bucket of
 * [slotStart, paddedEnd) under a UNIQUE multikey index on `keys` — so exactly
 * one overlapping request can hold the window and the loser 409s.
 *
 * Mock fidelity note: the holds `insertOne` mock below yields once (both
 * requests "in flight") but then runs its check+insert with NO awaits in
 * between — that synchronous-atomic section is exactly what a real MongoDB
 * single-document insert guarantees and what a naive check-then-insert mock
 * would NOT guarantee. The appt overlap `findOne` mock replays the
 * production predicate (existing.slot_start < paddedEnd &&
 * existing.slot_end > slotStart over blocking statuses), not a canned null.
 *
 * Mutating production (e.g. removing the claimPaddedWindow call, or making
 * paddedWindowKeys return []) lets both overlapping requests persist →
 * `created` has length 2 → red.
 */
import { ConflictException } from '@nestjs/common';
import { AppointmentsService, paddedWindowKeys } from './appointments.service';

const BLOCKING = new Set(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS']);

function dupKey(): any {
  const err: any = new Error('E11000 duplicate key');
  err.code = 11000;
  return err;
}

const tick = () => new Promise<void>((r) => setImmediate(r));

/** Tomorrow at HH:MM UTC (always future, 15-min boundary, zero seconds). */
function isoTomorrow(hh: number, mm: number): string {
  const d = new Date(Date.now() + 24 * 3600_000);
  d.setUTCHours(hh, mm, 0, 0);
  return d.toISOString();
}

function harness() {
  const created: any[] = [];
  const liveHolds = new Map<string, any>();
  let creates = 0;
  let arrived = 0;
  let releaseGate: () => void = () => undefined;
  const gate = new Promise<void>((r) => {
    releaseGate = r;
  });

  const holdsCol: any = {
    createIndex: jest.fn(async () => 'idx'),
    // Faithful UNIQUE-multikey mock in two phases:
    //  1. BARRIER — both concurrent claims must be "in flight" before either
    //     commits (models two requests overlapping on the wire; a lone
    //     setImmediate tick does NOT overlap them — the winner would complete
    //     and release before the loser even attempts its insert).
    //  2. ATOMIC check+insert with no awaits — exactly what a real MongoDB
    //     single-document insert guarantees and a naive check-then-insert
    //     mock would not.
    insertOne: jest.fn(async (doc: any) => {
      arrived += 1;
      if (arrived >= 2) releaseGate();
      else await gate;
      for (const k of doc.keys) {
        const live = liveHolds.get(k);
        if (live && new Date(live.expires_at).getTime() > Date.now()) throw dupKey();
      }
      for (const k of doc.keys) liveHolds.set(k, doc);
      return { insertedId: 'hold-1' };
    }),
    deleteOne: jest.fn(async (q: any) => {
      for (const [k, v] of [...liveHolds]) if (v.owner === q.owner) liveHolds.delete(k);
      return { deletedCount: 1 };
    }),
  };

  const apptModel: any = {
    findOne: jest.fn(async (q: any) => {
      if (q?.doctor_id && q?.slot_start?.$lt && q?.slot_end?.$gt) {
        const pEnd = new Date(q.slot_start.$lt).getTime();
        const sStart = new Date(q.slot_end.$gt).getTime();
        const hit = created.find(
          (c) =>
            BLOCKING.has(c.status) &&
            new Date(c.slot_start).getTime() < pEnd &&
            new Date(c.slot_end).getTime() > sStart,
        );
        return hit || null;
      }
      if (q?.id) {
        const found = created.find((c) => c.id === q.id);
        return found ? { ...found, toObject: () => ({ ...found }) } : null;
      }
      return null;
    }),
    create: jest.fn(async (doc: any) => {
      creates += 1;
      const row = { id: `appt-${creates}`, status: 'PENDING', ...doc };
      created.push(row);
      return row;
    }),
  };
  const providerModel: any = {
    findOne: jest.fn(async () => ({ id: 'doc-1', consultation_modes: ['clinic'], price_clinic: 100 })),
  };
  const connection: any = {
    collection: (name: string) =>
      name === 'appointment_slot_holds' ? holdsCol : { findOne: async () => null },
    db: { collection: () => ({ findOne: async () => null }) },
  };
  const svc = new AppointmentsService(
    apptModel,
    providerModel,
    connection,
    { emit: jest.fn() } as any,
    { announceCreated: jest.fn(async () => undefined) } as any,
    {} as any,
  );
  return { svc, created, liveHolds, holdsCol };
}

const user = { id: 'patient-a', role: 'patient' };
const bodyFor = (slot_start: string) =>
  ({ doctor_id: 'doc-1', service_type: 'clinic', slot_start, payment_method: 'card' }) as any;

describe('F1 padded-window hold kills the buffer-overlap race (mocked)', () => {
  it('two overlapping-but-different starts yield exactly one booking', async () => {
    const { svc, created, liveHolds } = harness();
    const settled = await Promise.allSettled([
      svc.create(user, bodyFor(isoTomorrow(10, 0))),
      svc.create(user, bodyFor(isoTomorrow(10, 15))),
    ]);
    const won = settled.filter((s) => s.status === 'fulfilled');
    const lost = settled.filter((s) => s.status === 'rejected') as Array<{ reason: any }>;
    expect(created).toHaveLength(1); // the race previously persisted BOTH
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(lost[0].reason).toBeInstanceOf(ConflictException);
    expect(lost[0].reason.message).toMatch(/slot_already_booked/);
    expect(liveHolds.size).toBe(0); // holds released on every exit
  });

  it('same-slot double-tap stays safe (one booking, one 409)', async () => {
    const { svc, created } = harness();
    const start = isoTomorrow(11, 0);
    const settled = await Promise.allSettled([
      svc.create(user, bodyFor(start)),
      svc.create(user, bodyFor(start)),
    ]);
    expect(created).toHaveLength(1);
    expect(settled.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
    const lost = settled.filter((s) => s.status === 'rejected') as Array<{ reason: any }>;
    expect(lost).toHaveLength(1);
    expect(lost[0].reason).toBeInstanceOf(ConflictException);
  });

  it('non-overlapping bookings both succeed (no false 409 from bucket sharing)', async () => {
    const { svc, created } = harness();
    const settled = await Promise.allSettled([
      svc.create(user, bodyFor(isoTomorrow(10, 0))),
      svc.create(user, bodyFor(isoTomorrow(12, 0))),
    ]);
    expect(settled.filter((s) => s.status === 'fulfilled')).toHaveLength(2);
    expect(created).toHaveLength(2);
  });

  it('paddedWindowKeys: overlapping windows share a bucket, touching windows share none', () => {
    const a = paddedWindowKeys('doc-1', new Date('2030-01-01T10:00:00.000Z'), new Date('2030-01-01T10:35:00.000Z'));
    const b = paddedWindowKeys('doc-1', new Date('2030-01-01T10:15:00.000Z'), new Date('2030-01-01T10:50:00.000Z'));
    const c = paddedWindowKeys('doc-1', new Date('2030-01-01T10:35:00.000Z'), new Date('2030-01-01T11:10:00.000Z'));
    expect(a.filter((k) => b.includes(k)).length).toBeGreaterThan(0);
    expect(a.filter((k) => c.includes(k))).toHaveLength(0);
  });
});
