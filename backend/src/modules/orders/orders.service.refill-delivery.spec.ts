import { OrdersService } from './orders.service';
import { OrderState } from '../../common/enums';

describe('OrdersService chronic refill completion', () => {
  it('fails closed for legacy pharmacy transition instead of clearing refill state', async () => {
    const updateReminder = jest.fn().mockResolvedValue({ matchedCount: 1 });
    const order: any = {
      id: 'refill-order-1', patient_id: 'patient-1', pharmacy_id: 'pharmacy-1', state: OrderState.CREATED, state_history: [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({ id: 'refill-order-1', state: order.state }),
    };
    const orderRepository: any = { findOne: jest.fn().mockResolvedValue(order) };
    const events: any = { emit: jest.fn() };
    const dispatchSvc: any = {};
    const engine: any = { apply: jest.fn(async ({ mutate }) => mutate()) };
    const conn: any = { collection: jest.fn((name: string) => name === 'medicationreminders' ? { updateOne: updateReminder } : {}) };
    const coupons: any = {};
    const loyaltyRedeem: any = {};
    const refundExec: any = {};
    const cancelPolicy: any = {};
    const abusePrevention: any = {};
    const rankingEvents: any = {};
    const service = new OrdersService(
      orderRepository,
      {} as any,
      {} as any,
      {} as any,
      events,
      dispatchSvc,
      engine,
      conn,
      coupons,
      loyaltyRedeem,
      refundExec,
      cancelPolicy,
      abusePrevention,
      rankingEvents,
    );

    await expect(service.transition('refill-order-1', OrderState.DELIVERED, { id: 'admin-1', role: 'admin' }))
      .rejects.toMatchObject({ response: { message: 'canonical_pharmacy_flow_required' } });
    expect(updateReminder).not.toHaveBeenCalled();
  });
});
