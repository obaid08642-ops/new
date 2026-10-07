/**
 * 15.2 — one in-flight payment per order (server side).
 *
 * PaymentsService.createPaymentIntent persists an `initiating` reservation
 * guarded by a partial unique index before calling the PSP; the loser of a
 * race hits 11000 and returns the winner's live transaction instead of
 * creating a second charge. This spec fires two concurrent intents for the
 * SAME booking (rapid-tap shape, mocked models — no mongod here) and pins:
 * exactly one transaction record, exactly one PSP call, both callers sharing
 * the winner.
 *
 * Mutating the production 11000 catch (e.g. code check to 'NEVER') makes the
 * loser throw instead of returning the active txn → red.
 */
import { PaymentsService } from './payments.module';

describe('15.2 one in-flight payment per order (mocked models)', () => {
  it('two concurrent intents for one booking create one txn and one PSP charge', async () => {
    const booking = {
      id: 'booking-1', patient_id: 'patient-a', payment_status: 'pending', total: 50, payment_method: 'card',
    };
    const labs = { findOne: jest.fn(() => ({ lean: async () => ({ ...booking }) })) };
    const activeTxn = { id: 'txn-1', booking_kind: 'lab', booking_id: 'booking-1', status: 'initiating' };
    let finds = 0;
    let creates = 0;
    const createdTx: any[] = [];
    const txns: any = {
      findOne: jest.fn(() => ({
        lean: async () => {
          finds += 1;
          // Both racers miss the pre-check; the loser's 11000 catch finds the winner.
          return finds <= 2 ? null : { ...activeTxn };
        },
      })),
      create: jest.fn(async (doc: any) => {
        creates += 1;
        if (creates > 1) {
          const err: any = new Error('E11000 duplicate key');
          err.code = 11000;
          throw err;
        }
        const row = { id: 'txn-1', ...doc };
        createdTx.push(row);
        return row;
      }),
      updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
      findOneAndUpdate: jest.fn(async () => ({ id: 'txn-1', status: 'pending' })),
    };
    const svc = new PaymentsService(
      txns, {} as any, labs as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, { emit: jest.fn() } as any, {} as any, {} as any,
    );
    const createIntent = jest.fn(async () => ({ intent_id: 'pi_1' }));
    (svc as any).adapter = { name: 'mock', createIntent };

    const user = { id: 'patient-a', role: 'patient' };
    const [a, b] = await Promise.all([
      svc.createPaymentIntent(user, 'lab', 'booking-1', 'tap-same-key'),
      svc.createPaymentIntent(user, 'lab', 'booking-1', 'tap-same-key'),
    ]);

    expect(createdTx).toHaveLength(1);          // exactly one record
    expect(createIntent).toHaveBeenCalledTimes(1); // exactly one PSP charge
    expect(a.id).toBe('txn-1');
    expect(b.id).toBe('txn-1');                 // loser shares the winner
  });
});
