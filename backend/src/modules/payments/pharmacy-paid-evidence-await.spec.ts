/**
 * A verified card payment answers only after the pharmacy payment evidence is written. The fulfilment gate
 * (pharmacy-allocation assertFulfillmentAuthorized) reads that evidence, so a pharmacy that confirms right after the
 * patient paid got payment_confirmation_required whenever the listener had not finished (live gate, j_pharmacy).
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentsService } from './payments.module';

describe('paid pharmacy order: evidence written before verify answers', () => {
  it('awaits the moyasar.payment.paid listener', async () => {
    const order = { id: 'o1', status: 'cash_card_payment_pending', patient_account_id: 'p1', selected_offer_id: 'f1', selected_offer_version: 1,
      pricing_snapshot: { hash: 'h1', totals: { currency: 'SAR', total: 25 } } };
    const coll = { findOne: async () => order, updateOne: async () => ({ modifiedCount: 1 }) };
    const events = new EventEmitter2();
    let evidence: any = null;
    events.on('moyasar.payment.paid', async (p: any) => { await new Promise((r) => setTimeout(r, 30)); evidence = p; }, { async: true, promisify: true });
    const svc = new (PaymentsService as any)(
      { db: { collection: () => coll } }, {}, {}, {}, {}, {}, {}, {}, {}, events, { emitToUser: () => undefined }, {}, undefined,
    );
    await svc.finalizeGovernedPharmacyPaid({ id: 'txn-1', booking_id: 'o1', amount: 25, paid_at: new Date(), gateway_charge_id: 'ch-1' });
    expect(evidence?.metadata?.order_id).toBe('o1');
  });
});
