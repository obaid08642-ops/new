/** 16.12 / D-10 - no loyalty accrual on prescription items; mixed carts and other services still earn once. */
import { LoyaltyService } from './loyalty.service';

function build(orderItems: Array<{ requires_prescription?: boolean }> | null) {
  const awards: Array<[string, string, string, string]> = [];
  const service: any = Object.create(LoyaltyService.prototype);
  service.conn = {
    collection: (name: string) => ({
      findOne: async () => (name === 'pharmacy_orders' && orderItems ? { items: orderItems } : null),
    }),
  };
  service.awardPoints = async (u: string, reason: string, refType: string, refId: string) => { awards.push([u, reason, refType, refId]); return { ok: true }; };
  return { service: service as LoyaltyService, awards };
}

describe('prescription items earn no points', () => {
  it('an order whose every line is prescription-only earns nothing (delivered event)', async () => {
    const { service, awards } = build([{ requires_prescription: true }, { requires_prescription: true }]);
    await service.onOrderDelivered({ patient_id: 'p1', order_id: 'o1' });
    expect(awards).toEqual([]);
  });
  it('an order whose every line is prescription-only earns nothing (service.completed event)', async () => {
    const { service, awards } = build([{ requires_prescription: true }]);
    await service.onServiceCompleted({ patient_account_id: 'p1', entity_type: 'order', entity_id: 'o1' });
    expect(awards).toEqual([]);
  });
  it('an order with at least one over-the-counter line earns once', async () => {
    const { service, awards } = build([{ requires_prescription: true }, { requires_prescription: false }]);
    await service.onOrderDelivered({ patient_id: 'p1', order_id: 'o2' });
    expect(awards).toEqual([['p1', 'order_delivered', 'order', 'o2']]);
  });
  it('an order we cannot read earns (the safe side for the patient) but only through the idempotent award', async () => {
    const { service, awards } = build(null);
    await service.onServiceCompleted({ patient_account_id: 'p1', entity_type: 'order', entity_id: 'o3' });
    expect(awards).toEqual([['p1', 'order_delivered', 'order', 'o3']]);
  });
  it('a consultation or a lab booking is not an order and still earns', async () => {
    const { service, awards } = build([{ requires_prescription: true }]);
    await service.onServiceCompleted({ patient_account_id: 'p1', entity_type: 'appointment', entity_id: 'a1' });
    expect(awards).toEqual([['p1', 'booking_completed', 'appointment', 'a1']]);
  });
});
