import { OrdersService } from './orders.service';
import { OrderState } from '../../common/enums';

describe('OrdersService chronic refill completion', () => {
  it('clears a chronic refill pending link only when the order is delivered', async () => {
    const updateReminder = jest.fn().mockResolvedValue({ matchedCount: 1 });
    const order: any = {
      id: 'refill-order-1', patient_id: 'patient-1', pharmacy_id: 'pharmacy-1', state: OrderState.CREATED, state_history: [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({ id: 'refill-order-1', state: order.state }),
    };
    const orderRepository: any = { findOne: jest.fn().mockResolvedValue(order) };
    const service = new OrdersService(
      orderRepository,
      {} as any,
      {} as any,
      {} as any,
      { emit: jest.fn() } as any,
      {} as any,
      { apply: jest.fn(async ({ mutate }) => mutate()) } as any,
      { collection: jest.fn((name: string) => name === 'medicationreminders' ? { updateOne: updateReminder } : {}) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.transition('refill-order-1', OrderState.DELIVERED, { id: 'admin-1', role: 'admin' });

    expect(updateReminder).toHaveBeenCalledWith(
      { patient_id: 'patient-1', refill_pending_order_id: 'refill-order-1' },
      expect.objectContaining({
        $set: expect.objectContaining({ order_id: 'refill-order-1', refill_fulfilled_at: expect.any(Date) }),
        $unset: { refill_pending_order_id: 1 },
      }),
    );
    expect(JSON.stringify(updateReminder.mock.calls)).not.toContain('pills_remaining');
    expect(JSON.stringify(updateReminder.mock.calls)).not.toContain('refill_date');
  });
});
