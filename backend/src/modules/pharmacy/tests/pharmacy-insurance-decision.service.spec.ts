import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PharmacyInsuranceDecisionService } from '../services/pharmacy-insurance-decision.service';

const sessionDoc = (value: any) => ({ session: jest.fn().mockResolvedValue(value) });
const sessionLean = (value: any) => ({ session: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(value) })) });

describe('PharmacyInsuranceDecisionService', () => {
  const order = (overrides: any = {}) => ({
    id: 'order-1', patient_account_id: 'patient-1', payment_method: 'insurance', status: 'insurance_decision_pending',
    selected_offer_id: 'offer-1', selected_offer_version: 2, selected_allocation_id: 'allocation-1',
    pricing_snapshot: { totals: { total: 120, currency: 'SAR' } }, ...overrides,
  });
  const offer = (overrides: any = {}) => ({
    id: 'offer-1', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', version: 2, status: 'selected', totals: { total: 120, currency: 'SAR' },
    items: [{ order_item_id: 'item-1', qty_offered: 2, unit_price: 20 }, { order_item_id: 'item-2', qty_offered: 1, unit_price: 80 }], ...overrides,
  });
  const allocation = (overrides: any = {}) => ({ id: 'allocation-1', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', offer_id: 'offer-1', offer_version: 2, status: 'pending_review', items: [{ inventory_id: 'inventory-1', action: 'available', qty_offered: 2 }], ...overrides });

  function setup(options: { order?: any; offer?: any; allocation?: any; account?: any; orderUpdate?: any; outboxDuplicate?: boolean } = {}) {
    const outbox = { updateOne: jest.fn().mockImplementation(async () => { if (options.outboxDuplicate) { const error: any = new Error('duplicate'); error.code = 11000; throw error; } return { upsertedCount: 1 }; }) };
    const audit = { insertOne: jest.fn().mockResolvedValue({ acknowledged: true }) };
    const session: any = { withTransaction: jest.fn(async (work) => work(session)), endSession: jest.fn().mockResolvedValue(undefined) };
    const connection: any = { startSession: jest.fn().mockResolvedValue(session), collection: jest.fn((name: string) => name === 'domain_outbox' ? outbox : audit) };
    const orders: any = { findOne: jest.fn(() => sessionDoc(options.order ?? order())), updateOne: jest.fn().mockResolvedValue(options.orderUpdate ?? { modifiedCount: 1 }) };
    const offers: any = { findOne: jest.fn(() => sessionLean(options.offer ?? offer())) };
    const allocations: any = { findOne: jest.fn((filter: any) => filter.pharmacy_account_id ? sessionLean(options.allocation ?? allocation()) : sessionDoc(options.allocation ?? allocation())), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
    const inventory: any = { updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }) };
    const accounts: any = { findOne: jest.fn(() => sessionLean(options.account === undefined ? { id: 'pharmacy-1', provider_type: 'pharmacy', status: 'approved' } : options.account)) };
    return { service: new PharmacyInsuranceDecisionService(connection, orders, offers, allocations, inventory, accounts), orders, offers, allocations, inventory, accounts, outbox, audit, session };
  }

  const fullItems = [{ order_item_id: 'item-1', outcome: 'approved', approved_qty: 2 }, { order_item_id: 'item-2', outcome: 'approved', approved_qty: 1 }];

  it('lets only the selected approved pharmacy create a full decision, derives all money server-side, and writes audit/outbox in its transaction', async () => {
    const { service, orders, outbox, audit, session } = setup();
    const result = await service.decide({ id: 'pharmacy-1', role: 'provider' }, 'order-1', {
      approval_reference: 'INS-APPROVAL-001', idempotency_key: 'insurance_decision_key_0001', copayAmount: 1, coveredAmount: 99999, insurer_share: 99999, items: fullItems,
    });
    expect(result).toEqual(expect.objectContaining({ ok: true, next_status: 'confirmed' }));
    expect(result.decision).toEqual(expect.objectContaining({ outcome: 'full', insurer_share: 120, patient_share: 0, allocation_id: 'allocation-1' }));
    expect(orders.updateOne).toHaveBeenCalledWith(expect.objectContaining({ selected_offer_id: 'offer-1', selected_allocation_id: 'allocation-1' }), expect.objectContaining({ $set: expect.objectContaining({ status: 'confirmed' }) }), { session });
    expect(audit.insertOne).toHaveBeenCalledWith(expect.objectContaining({ action: 'pharmacy.insurance_decision.recorded', provider_account_id: 'pharmacy-1' }), { session });
    expect(outbox.updateOne).toHaveBeenCalledWith(expect.objectContaining({ idempotency_key: 'insurance_decision_key_0001' }), expect.anything(), expect.objectContaining({ upsert: true, session }));
  });

  it('derives a partial co-pay and blocks unapproved pharmacy, wrong selected allocation, or forged global outcome', async () => {
    const partial = setup();
    const result = await partial.service.decide({ id: 'pharmacy-1', role: 'provider' }, 'order-1', { outcome: 'full', approval_reference: 'INS-APPROVAL-002', idempotency_key: 'insurance_decision_key_0002', items: [{ order_item_id: 'item-1', outcome: 'approved', approved_qty: 2 }, { order_item_id: 'item-2', outcome: 'rejected', reason: 'limit' }] });
    expect(result).toEqual(expect.objectContaining({ next_status: 'waiting_copay' }));
    expect(result.decision).toEqual(expect.objectContaining({ outcome: 'partial', insurer_share: 40, patient_share: 80 }));
    const inactive = setup({ account: null });
    await expect(inactive.service.decide({ id: 'pharmacy-1', role: 'provider' }, 'order-1', { approval_reference: 'INS-APPROVAL-003', idempotency_key: 'insurance_decision_key_0003', items: fullItems })).rejects.toBeInstanceOf(ForbiddenException);
    const otherAllocation = setup({ allocation: allocation({ pharmacy_account_id: 'other-pharmacy' }) });
    await expect(otherAllocation.service.decide({ id: 'pharmacy-1', role: 'provider' }, 'order-1', { approval_reference: 'INS-APPROVAL-004', idempotency_key: 'insurance_decision_key_0004', items: fullItems })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('treats an outbox E11000 as the documented idempotent replay while preserving the transactional decision', async () => {
    const { service } = setup({ outboxDuplicate: true });
    await expect(service.decide({ id: 'pharmacy-1', role: 'provider' }, 'order-1', { approval_reference: 'INS-APPROVAL-DUP', idempotency_key: 'insurance_decision_key_dup', items: fullItems })).resolves.toEqual(expect.objectContaining({ ok: true, next_status: 'confirmed' }));
  });

  it('fails closed when the conditional order update loses its claim and never writes audit or outbox', async () => {
    const { service, audit, outbox } = setup({ orderUpdate: { matchedCount: 0, modifiedCount: 0 } });
    await expect(service.decide({ id: 'pharmacy-1', role: 'provider' }, 'order-1', { approval_reference: 'INS-APPROVAL-005', idempotency_key: 'insurance_decision_key_0005', items: fullItems })).rejects.toBeInstanceOf(BadRequestException);
    expect(audit.insertOne).not.toHaveBeenCalled();
    expect(outbox.updateOne).not.toHaveBeenCalled();
  });

  it('allows the patient to cancel a rejected decision once, releases selected inventory, and persists an idempotent cancellation intent', async () => {
    const rejected = order({ status: 'manual_review', insurance_decision: { outcome: 'rejected' } });
    const { service, inventory, allocations, orders, outbox } = setup({ order: rejected });
    const result = await service.cancelRejectedByPatient({ id: 'patient-1', role: 'patient' }, 'order-1', 'insurance_cancel_key_000001');
    expect(result).toEqual({ ok: true, idempotent: false, status: 'cancelled' });
    expect(inventory.updateOne).toHaveBeenCalledWith({ id: 'inventory-1', provider_account_id: 'pharmacy-1' }, { $inc: { stock: 2 } }, expect.anything());
    expect(allocations.updateOne).toHaveBeenCalledWith(expect.objectContaining({ id: 'allocation-1' }), expect.objectContaining({ $set: expect.objectContaining({ status: 'cancelled' }) }), expect.anything());
    expect(orders.updateOne).toHaveBeenCalledWith(expect.objectContaining({ patient_account_id: 'patient-1', status: 'manual_review' }), expect.objectContaining({ $set: expect.objectContaining({ status: 'cancelled' }) }), expect.anything());
    expect(outbox.updateOne).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'pharmacy.insurance.rejected_cancelled' }), expect.anything(), expect.anything());
  });
});
