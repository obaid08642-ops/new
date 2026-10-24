import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { reliabilityRates } from './ordering-engine';
import { OrderingLifecycleService } from './ordering-lifecycle.service';

// M7 pieces without a database: the rates, the arrival-code lock, who may act, the confirm deadline.
describe('M7 reliability rates', () => {
  it('no record: benefit of the doubt, always inside 0..1', () => {
    expect(reliabilityRates(null)).toEqual({ acceptance_rate: 1, on_time_rate: 1, cancellation_rate: 0 });
  });
  it('rates from the counters', () => {
    expect(reliabilityRates({ offered: 20, accepted: 3, completed: 2, on_time: 1, cancellations: 20 })).toEqual({ acceptance_rate: 0.15, on_time_rate: 0.5, cancellation_rate: 0.91 });
  });
  it('a counter above its base is capped at 1; junk counts as zero', () => {
    expect(reliabilityRates({ offered: 2, accepted: 5, completed: 1, on_time: 9 } as never)).toMatchObject({ acceptance_rate: 1, on_time_rate: 1 });
    expect(reliabilityRates({ offered: -3, accepted: 'x' } as never)).toEqual({ acceptance_rate: 1, on_time_rate: 1, cancellation_rate: 0 });
  });
});

function make(booking: any, lifecycle: any) {
  const lc = { ...lifecycle };
  const bookings = { findOne: jest.fn(async () => booking), updateOne: jest.fn(async () => ({})) };
  const lcCol = {
    findOne: jest.fn(async () => lc),
    updateOne: jest.fn(async () => ({})),
    findOneAndUpdate: jest.fn(async (f: any, u: any) => {
      if (f.wrong_codes && lc.wrong_codes >= f.wrong_codes.$lt) return null;
      if (u.$inc?.wrong_codes) { lc.wrong_codes += 1; return { ...lc }; }
      return { ...lc };
    }),
  };
  const conn: any = { collection: jest.fn((n: string) => (n === 'labbookings' ? bookings : lcCol)) };
  const ordering: any = { registerLifecycle: jest.fn(), bump: jest.fn(async () => undefined) };
  return { svc: new OrderingLifecycleService(conn, ordering, {} as never, {} as never, {} as never), lc, ordering, lcCol };
}
const B = { id: 'b1', patient_id: 'p', provider_account_id: 'lab', order_group_id: 'og', state: 'NEW_REQUEST', scheduled_at: new Date() };
const LC = { booking_id: 'b1', patient_id: 'p', provider_account_id: 'lab', confirm_deadline_at: new Date(Date.now() + 60_000), confirmed_at: null, arrival_code: '4821', wrong_codes: 0 };

describe('M7 arrival code', () => {
  it('two wrong tries are 400, the third locks (423), and a locked code refuses even the right one', async () => {
    const { svc } = make(B, LC);
    await expect(svc.arrive({ id: 'lab' }, 'b1', { code: '0000' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.arrive({ id: 'lab' }, 'b1', { code: '0000' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.arrive({ id: 'lab' }, 'b1', { code: '0000' })).rejects.toMatchObject({ status: 423 });
    await expect(svc.arrive({ id: 'lab' }, 'b1', { code: '4821' })).rejects.toMatchObject({ status: 423 });
  });

  it('the right code moves the visit to in service and counts an on-time arrival', async () => {
    const { svc, ordering } = make(B, LC);
    expect(await svc.arrive({ id: 'lab' }, 'b1', { code: '4821' })).toEqual({ status: 'in_service' });
    expect(ordering.bump).toHaveBeenCalledWith('lab', 'on_time');
  });

  it('no code exists before a staff member is assigned', async () => {
    const { svc } = make(B, { ...LC, arrival_code: undefined });
    await expect(svc.arrive({ id: 'lab' }, 'b1', { code: '1234' })).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('M7 who may act', () => {
  it('another provider is 403, an unknown booking 404, on every provider action', async () => {
    const other = make(B, LC).svc;
    await expect(other.confirm({ id: 'someone-else' }, 'b1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(other.postResults({ id: 'someone-else' }, 'b1', { values: [] } as never)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make(null, LC).svc.confirm({ id: 'lab' }, 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a patient who does not own the booking gets 404 on the visit', async () => {
    await expect(make(null, LC).svc.visit({ id: 'stranger' }, 'b1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('M7 confirm deadline', () => {
  it('a booking already cancelled for lateness cannot be confirmed', async () => {
    const { svc } = make(B, { ...LC, cancelled_at: new Date() });
    await expect(svc.confirm({ id: 'lab' }, 'b1')).rejects.toThrow('confirm_deadline_passed');
  });

  it('confirming twice is the same answer', async () => {
    const { svc } = make(B, { ...LC, confirmed_at: new Date() });
    expect(await svc.confirm({ id: 'lab' }, 'b1')).toEqual({ confirmed: true });
  });
});

describe('M7 expiry of an unconfirmed booking', () => {
  const past = new Date(Date.now() - 60_000);
  const makeExpiry = (booking: any, cancelUnconfirmed: () => Promise<boolean>) => {
    const updates: any[] = [];
    const bookings = { findOne: jest.fn(async () => booking), updateOne: jest.fn(async () => ({})) };
    const lcCol = { findOneAndUpdate: jest.fn(async () => ({ booking_id: 'b1' })), updateOne: jest.fn(async (f: any, u: any) => { updates.push(u); return {}; }), find: jest.fn() };
    const conn: any = { collection: jest.fn((n: string) => (n === 'labbookings' ? bookings : lcCol)) };
    const ordering: any = { bump: jest.fn(async () => undefined) };
    const labs: any = { cancelUnconfirmed: jest.fn(cancelUnconfirmed) };
    const svc: any = new OrderingLifecycleService(conn, ordering, labs, {} as never, {} as never);
    return { svc, updates, ordering, labs };
  };
  const due = { booking_id: 'b1', patient_id: 'p', provider_account_id: 'lab', quote_id: 'q', confirm_deadline_at: past, confirmed_at: null };

  it('a booking that is already past the cancellable point is not left locked: the claim is released and no deadline applies', async () => {
    const { svc, updates, ordering } = makeExpiry({ ...B, state: 'CONFIRMED' }, async () => false);
    await svc.expireOne(due);
    expect(updates).toEqual([{ $unset: { cancelled_at: '' }, $set: { confirm_deadline_at: null } }]);
    expect(ordering.bump).not.toHaveBeenCalled();
  });

  it('a missing booking releases the claim too and never cancels anything', async () => {
    const { svc, updates, labs } = makeExpiry(null, async () => true);
    await svc.expireOne(due);
    expect(labs.cancelUnconfirmed).not.toHaveBeenCalled();
    expect(updates[0]).toEqual({ $unset: { cancelled_at: '' }, $set: { confirm_deadline_at: null } });
  });

  it('a cancel that throws releases the claim so the next sweep retries, and the error still surfaces', async () => {
    const { svc, updates } = makeExpiry(B, async () => { throw new Error('boom'); });
    await expect(svc.expireOne(due)).rejects.toThrow('boom');
    expect(updates).toEqual([{ $unset: { cancelled_at: '' } }]);
  });
});
