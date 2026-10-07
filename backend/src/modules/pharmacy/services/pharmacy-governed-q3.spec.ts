/** Q-3: governed states ORDER_BROADCASTING / OFFERS_READY / CO_PAY_PENDING (mocked; the
 *  acceptance suite backend/acceptance/q-3/ is the red-then-green gate on the reviewer's side). */
import { PharmacyOrderService } from './pharmacy-order.service';

const orderDoc = (id: string, extra: any = {}) => ({
  id, patient_account_id: 'pat-1', status: 'broadcasting', payment_method: 'card',
  items: [], totals: {}, timeline: [], ...extra,
});
const insured = (id: string, acceptance?: any, extra: any = {}) => orderDoc(id, {
  status: 'waiting_copay', payment_method: 'insurance', coverage_mode: 'insurance',
  selected_offer_id: `off-${id}`, selected_offer_version: 1,
  totals: {}, pricing_snapshot: { offer_id: `off-${id}`, offer_version: 1, hash: 'a'.repeat(64) },
  insurance_decision: { outcome: 'partial', ...(acceptance ? { patient_acceptance: acceptance } : {}) },
  ...extra,
});

const svcWith = (order: any, liveOffer: boolean) => {
  const orders: any = { findOne: () => ({ lean: async () => order }) };
  const allocs: any = { find: () => ({ lean: async () => [] }) };
  const conn: any = {
    collection: (name: string) => (name === 'pharmacy_offers'
      ? { findOne: async () => (liveOffer ? { id: 'off-1' } : null) }
      : { findOne: async () => null }),
  };
  return new (PharmacyOrderService as any)(orders, allocs, {}, {}, {}, { emit: async () => undefined }, {}, conn);
};
const PATIENT = { id: 'pat-1', role: 'patient' };

describe('Q-3 governed states', () => {
  it('broadcasting, no live offer -> ORDER_BROADCASTING', async () => {
    expect((await svcWith(orderDoc('o1'), false).detail(PATIENT, 'o1')).governed_state).toBe('ORDER_BROADCASTING');
  });
  it('broadcasting + live offer -> OFFERS_READY', async () => {
    expect((await svcWith(orderDoc('o1'), true).detail(PATIENT, 'o1')).governed_state).toBe('OFFERS_READY');
  });
  it('partial, no acceptance -> INSURANCE_DECISION_READY', async () => {
    expect((await svcWith(insured('o2'), false).detail(PATIENT, 'o2')).governed_state).toBe('INSURANCE_DECISION_READY');
  });
  it('partial + co-pay accepted, unpaid -> CO_PAY_PENDING', async () => {
    expect((await svcWith(insured('o3', { kind: 'co-pay' }), false).detail(PATIENT, 'o3')).governed_state).toBe('CO_PAY_PENDING');
  });
  it('partial + co-pay accepted + paid -> CONFIRMED', async () => {
    expect((await svcWith(insured('o4', { kind: 'co-pay' }, { payment_status: 'paid' }), false).detail(PATIENT, 'o4')).governed_state).toBe('CONFIRMED');
  });
  it('selected card order keeps OFFER_SELECTED', async () => {
    const o = orderDoc('o5', {
      status: 'cash_card_payment_pending', selected_offer_id: 'off-sel', selected_offer_version: 1,
      pricing_snapshot: { offer_id: 'off-sel', offer_version: 1, hash: 'b'.repeat(64) },
    });
    expect((await svcWith(o, false).detail(PATIENT, 'o5')).governed_state).toBe('OFFER_SELECTED');
  });
});
