import { PharmacyAllocationService } from '../services/pharmacy-allocation.service';
import { PharmacyAllocationState, PharmacyOrderState } from '../schemas/pharmacy.schema';

// provider-journeys needs-review line 22: the Orders list marks an insurance order that waits for the
// pharmacy to record the insurer's decision, so its card can open the decision form inline.
describe('PharmacyAllocationService.listForProvider awaits_insurance_decision', () => {
  type Row = { id: string; order_id: string; offer_id?: string; status: string };
  type OrderRow = { id: string; status: string; selected_allocation_id: string; selected_offer_id: string; insurance_decision?: object };

  function setup(rows: Row[], orders: OrderRow[]) {
    const allocs = { find: jest.fn(() => ({ sort: () => ({ limit: () => ({ lean: jest.fn().mockResolvedValue(rows) }) }) })) };
    const orderFind = jest.fn((filter: { id: { $in: string[] }; status: string; insurance_decision: { $exists: boolean } }) => ({
      lean: jest.fn().mockResolvedValue(orders.filter((o) => filter.id.$in.includes(o.id) && o.status === filter.status && !o.insurance_decision)),
    }));
    const service = new PharmacyAllocationService(allocs as never, { find: orderFind } as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    return { service, orderFind };
  }
  const pharmacy = { id: 'pharmacy-1', role: 'pharmacy' };

  it('flags only the selected, pre-fulfilment allocation of an order in insurance_decision_pending', async () => {
    const rows: Row[] = [
      { id: 'a-ins', order_id: 'o-ins', offer_id: 'off-1', status: PharmacyAllocationState.PENDING_REVIEW },
      { id: 'a-card', order_id: 'o-card', offer_id: 'off-2', status: PharmacyAllocationState.PENDING_REVIEW },
      { id: 'a-done', order_id: 'o-done', offer_id: 'off-3', status: PharmacyAllocationState.PENDING_REVIEW },
      { id: 'a-other', order_id: 'o-other', offer_id: 'off-4', status: PharmacyAllocationState.PENDING_REVIEW },
      { id: 'a-ready', order_id: 'o-ready', offer_id: 'off-5', status: PharmacyAllocationState.READY_FOR_PICKUP },
    ];
    const orders: OrderRow[] = [
      { id: 'o-ins', status: PharmacyOrderState.INSURANCE_DECISION_PENDING, selected_allocation_id: 'a-ins', selected_offer_id: 'off-1' },
      { id: 'o-card', status: PharmacyOrderState.CASH_CARD_PAYMENT_PENDING, selected_allocation_id: 'a-card', selected_offer_id: 'off-2' },
      { id: 'o-done', status: PharmacyOrderState.INSURANCE_DECISION_PENDING, selected_allocation_id: 'a-done', selected_offer_id: 'off-3', insurance_decision: { outcome: 'full' } },
      { id: 'o-other', status: PharmacyOrderState.INSURANCE_DECISION_PENDING, selected_allocation_id: 'someone-else', selected_offer_id: 'off-4' },
      { id: 'o-ready', status: PharmacyOrderState.INSURANCE_DECISION_PENDING, selected_allocation_id: 'a-ready', selected_offer_id: 'off-5' },
    ];
    const { service, orderFind } = setup(rows, orders);
    const out = await service.listForProvider(pharmacy);
    expect(out.map((r: { id: string; awaits_insurance_decision: boolean }) => [r.id, r.awaits_insurance_decision])).toEqual([
      ['a-ins', true], ['a-card', false], ['a-done', false], ['a-other', false], ['a-ready', false],
    ]);
    expect(orderFind).toHaveBeenCalledTimes(1);
    expect(orderFind.mock.calls[0][0]).toEqual({ id: { $in: ['o-ins', 'o-card', 'o-done', 'o-other', 'o-ready'] }, status: PharmacyOrderState.INSURANCE_DECISION_PENDING, insurance_decision: { $exists: false } });
  });

  it('clears the flag once the decision is recorded (order leaves insurance_decision_pending)', async () => {
    const rows: Row[] = [{ id: 'a-ins', order_id: 'o-ins', offer_id: 'off-1', status: PharmacyAllocationState.PENDING_REVIEW }];
    const decided: OrderRow[] = [{ id: 'o-ins', status: PharmacyOrderState.CONFIRMED, selected_allocation_id: 'a-ins', selected_offer_id: 'off-1', insurance_decision: { outcome: 'full' } }];
    const out = await setup(rows, decided).service.listForProvider(pharmacy);
    expect(out[0].awaits_insurance_decision).toBe(false);
  });

  it('does not query orders for an empty list', async () => {
    const { service, orderFind } = setup([], []);
    await expect(service.listForProvider(pharmacy)).resolves.toEqual([]);
    expect(orderFind).not.toHaveBeenCalled();
  });
});
