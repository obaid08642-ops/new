import { PharmacyChatService } from './pharmacy-chat.service';

function createService() {
  const thread: any = { id: 'thread-1', order_id: 'order-1', order_item_id: 'item-1', patient_account_id: 'patient-1', pharmacy_account_id: 'pharmacy-1', status: 'open', save: jest.fn().mockResolvedValue(undefined) };
  const order: any = { id: 'order-1', governed_state: 'NEGOTIATION_REQUIRED', selected_pharmacy_account_id: 'pharmacy-1', timeline: [], items: [{ id: 'item-1', name: 'Original medicine', unit_price: 10 }], save: jest.fn().mockResolvedValue(undefined), markModified: jest.fn() };
  const threads: any = { findOne: jest.fn().mockResolvedValue(thread) };
  const messages: any = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'message-1', substitute_offer: { sku: 'alt', price: 99 } }) }), create: jest.fn().mockResolvedValue({}) };
  const orders: any = { findOne: jest.fn().mockResolvedValue(order) };
  const allocations: any = { findOne: jest.fn() };
  const bus: any = { emit: jest.fn().mockResolvedValue(undefined) };
  return { service: new PharmacyChatService(threads, messages, orders, allocations, bus), thread, order, messages, allocations };
}

describe('PharmacyChatService governed negotiation', () => {
  it('records accepted substitute intent without mutating the allocation or the original order item price', async () => {
    const { service, thread, order, allocations } = createService();

    await expect(service.acceptSubstitute({ id: 'patient-1' }, 'thread-1', 'message-1')).resolves.toEqual({ ok: true, final_quote_required: true });

    expect(thread.resolution).toBe('accepted_pending_requote');
    expect(order.items).toEqual([{ id: 'item-1', name: 'Original medicine', unit_price: 10 }]);
    expect(order.save).toHaveBeenCalled();
    expect(allocations.findOne).not.toHaveBeenCalled();
  });

  it('records a removal request without deleting an order item before the pharmacy revises the final quote', async () => {
    const { service, thread, order, allocations } = createService();

    await expect(service.rejectOrRemove({ id: 'patient-1' }, 'thread-1', 'removed')).resolves.toEqual({ ok: true, final_quote_required: true });

    expect(thread.resolution).toBe('removed_pending_requote');
    expect(order.items).toEqual([{ id: 'item-1', name: 'Original medicine', unit_price: 10 }]);
    expect(allocations.findOne).not.toHaveBeenCalled();
  });
});
