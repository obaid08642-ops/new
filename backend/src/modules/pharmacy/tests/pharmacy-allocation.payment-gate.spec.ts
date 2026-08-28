import { BadRequestException } from '@nestjs/common';
import { PharmacyAllocationService } from '../services/pharmacy-allocation.service';
import { PharmacyAllocationState } from '../schemas/pharmacy.schema';

describe('PharmacyAllocationService fulfillment gate', () => {
  function setup(orderPatch: any = {}, paymentEvidence: any = null) {
    const allocation: any = {
      id: 'alloc-1', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', offer_id: 'offer-1', offer_version: 3,
      status: PharmacyAllocationState.PENDING_REVIEW,
      totals: { total: 75, currency: 'SAR' }, items: [{ action: 'available' }], timeline: [], save: jest.fn(), toObject: jest.fn(() => ({ id: 'alloc-1' })),
    };
    const order: any = {
      id: 'order-1', patient_account_id: 'patient-1', selected_offer_id: 'offer-1', selected_allocation_id: 'alloc-1', selected_offer_version: 3,
      payment_method: 'card', payment_status: 'paid',
      pricing_snapshot: { offer_id: 'offer-1', offer_version: 3, hash: 'quote-hash-1', totals: { total: 75 } }, ...orderPatch,
    };
    const paymentCollection = { findOne: jest.fn().mockResolvedValue(paymentEvidence), insertOne: jest.fn().mockResolvedValue(undefined) };
    const policyCollection = { findOne: jest.fn().mockResolvedValue({ active: true, payment_method: 'cod', allow_preparation: true }) };
    const allocs: any = { findOne: jest.fn().mockResolvedValue(allocation), find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue([]) })), db: { collection: jest.fn(() => ({ findOne: jest.fn(), insertOne: jest.fn() })) } };
    const orderDocument: any = { ...order, timeline: [], save: jest.fn() };
    const orders: any = {
      findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(order) })),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      db: { collection: jest.fn((name: string) => {
        if (name === 'pharmacy_fulfillment_policies') return policyCollection;
        if (name === 'pharmacy_payment_evidence') return paymentCollection;
        return { findOne: jest.fn(), insertOne: jest.fn() };
      }) },
    };
    const notifications: any = { notifyPatientAllocationConfirmed: jest.fn().mockResolvedValue(undefined), notifyPatientAllocationProgress: jest.fn().mockResolvedValue(undefined) };
    const bus: any = { emit: jest.fn().mockResolvedValue(undefined) };
    const service = new PharmacyAllocationService(allocs, orders, {} as any, {} as any, notifications, bus, {} as any);
    return { service, allocation, paymentCollection, policyCollection };
  }

  it('rejects a generic paid flag without selected-offer webhook evidence', async () => {
    const { service, allocation, paymentCollection } = setup();
    await expect(service.confirm({ id: 'pharmacy-1', role: 'pharmacy' }, 'alloc-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(allocation.save).not.toHaveBeenCalled();
    expect(paymentCollection.findOne).toHaveBeenCalledWith(expect.objectContaining({ order_id: 'order-1', selected_offer_id: 'offer-1', selected_offer_version: 3, quote_snapshot_hash: 'quote-hash-1', amount: 75, currency: 'SAR', payer_account_id: 'patient-1', status: 'confirmed', gateway_payment_id: { $exists: true }, webhook_event_id: { $exists: true } }));
  });

  it('permits confirmation only with matching payment evidence and rejects a mismatched quote first', async () => {
    const paid = setup({}, { id: 'evidence-1', status: 'confirmed' });
    await expect(paid.service.confirm({ id: 'pharmacy-1', role: 'pharmacy' }, 'alloc-1')).resolves.toEqual({ id: 'alloc-1' });
    expect(paid.allocation.save).toHaveBeenCalled();
    const mismatch = setup({ selected_offer_version: 2 }, { id: 'evidence-1', status: 'confirmed' });
    await expect(mismatch.service.confirm({ id: 'pharmacy-1', role: 'pharmacy' }, 'alloc-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(mismatch.allocation.save).not.toHaveBeenCalled();
  });

  it('rejects COD delivery without collection proof, with a mismatched amount, and completes with exact-quote proof', async () => {
    // Allocation must be OUT_FOR_DELIVERY for the delivered transition to be valid.
    const noProof = setup({ payment_method: 'cod', status: 'cod_due_on_delivery' });
    noProof.allocation.status = PharmacyAllocationState.OUT_FOR_DELIVERY;
    await expect(noProof.service.delivered({ id: 'pharmacy-1', role: 'pharmacy' }, 'alloc-1'))
      .rejects.toThrow('cod_collection_proof_required');
    expect(noProof.allocation.save).not.toHaveBeenCalled();

    const mismatch = setup({ payment_method: 'cod', status: 'cod_due_on_delivery' });
    mismatch.allocation.status = PharmacyAllocationState.OUT_FOR_DELIVERY;
    await expect(mismatch.service.delivered({ id: 'pharmacy-1', role: 'pharmacy' }, 'alloc-1', { collection: { method: 'cash', amount_collected: 70 } }))
      .rejects.toThrow('collected_amount_must_match_selected_quote_total');
    expect(mismatch.allocation.save).not.toHaveBeenCalled();

    const ok = setup({ payment_method: 'cod', status: 'cod_due_on_delivery' });
    ok.allocation.status = PharmacyAllocationState.OUT_FOR_DELIVERY;
    await expect(ok.service.delivered({ id: 'pharmacy-1', role: 'pharmacy' }, 'alloc-1', { collection: { method: 'cash', amount_collected: 75 } }))
      .resolves.toEqual({ id: 'alloc-1' });
    expect(ok.allocation.status).toBe(PharmacyAllocationState.DELIVERED);
    expect(ok.paymentCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'cod_collection', order_id: 'order-1', allocation_id: 'alloc-1', amount: 75, method: 'cash', status: 'confirmed',
    }));
  });
});
