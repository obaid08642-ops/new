/**
 * 15.2 — one booking per slot per patient (server side).
 *
 * AppointmentsService.create runs an overlap check and inserts under a unique
 * index; the loser of a race hits 11000 and gets 409 slot_already_booked
 * instead of a second booking. This spec fires two concurrent creates for the
 * SAME patient + slot (double-tap shape, mocked repository — no mongod here)
 * and pins: exactly one booking row, one success, one 409.
 *
 * Mutating the production 11000 catch (e.g. code check to 'NEVER') makes the
 * loser throw the raw duplicate error instead of 409 → red.
 */
import { ConflictException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

function futureQuarterIso(): string {
  const d = new Date(Date.now() + 2 * 3600_000);
  d.setSeconds(0, 0);
  d.setMinutes(Math.floor(d.getMinutes() / 15) * 15);
  if (d.getTime() < Date.now() + 5 * 60_000) d.setMinutes(d.getMinutes() + 15);
  return d.toISOString();
}

describe('15.2 one booking per slot per patient (mocked repository)', () => {
  it('two concurrent creates for one slot yield one booking and one 409', async () => {
    const created: any[] = [];
    let creates = 0;
    const apptModel: any = {
      findOne: jest.fn(async (q: any) => {
        if (q?.doctor_id) return null; // overlap check: slot is free
        // refreshed read: production calls refreshed?.toObject(), so the mock
        // must expose toObject like a mongoose document does.
        if (q?.id) {
          const found = created.find((c) => c.id === q.id);
          return found ? { ...found, toObject: () => ({ ...found }) } : null;
        }
        return null;
      }),
      create: jest.fn(async (doc: any) => {
        creates += 1;
        if (creates > 1) {
          const err: any = new Error('E11000 duplicate key');
          err.code = 11000;
          throw err;
        }
        const row = { id: 'appt-1', ...doc };
        created.push(row);
        return row;
      }),
    };
    const providerModel: any = {
      findOne: jest.fn(async () => ({ id: 'doc-1', consultation_modes: ['clinic'], price_clinic: 100 })),
    };
    const svc = new AppointmentsService(
      apptModel, providerModel, {} as any, { emit: jest.fn() } as any, { announceCreated: jest.fn(async () => undefined) } as any, {} as any,
    );

    const user = { id: 'patient-a', role: 'patient' };
    const body = { doctor_id: 'doc-1', service_type: 'clinic', slot_start: futureQuarterIso(), payment_method: 'card' } as any;
    const settled = await Promise.allSettled([svc.create(user, body), svc.create(user, body)]);

    const won = settled.filter((s) => s.status === 'fulfilled') as Array<{ value: any }>;
    const lost = settled.filter((s) => s.status === 'rejected') as Array<{ reason: any }>;
    expect(created).toHaveLength(1); // exactly one booking row
    expect(won).toHaveLength(1);
    expect(won[0].value.id).toBe('appt-1');
    expect(lost).toHaveLength(1);
    expect(lost[0].reason).toBeInstanceOf(ConflictException);
    expect(lost[0].reason.message).toMatch(/slot_already_booked/);
  });
});
