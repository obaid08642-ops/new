import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PharmacyOrderState } from '../schemas/pharmacy.schema';
import { PharmacyOfferService, calculatePharmacyQuote } from './pharmacy-offer.service';

const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });

function createService(overrides: Record<string, any> = {}) {
  const order = {
    id: 'order-1',
    patient_account_id: 'patient-1',
    status: PharmacyOrderState.BROADCASTING,
    items: [{ id: 'line-1', qty: 2, matched_sku: 'SKU-1', name_ar: 'دواء' }],
    timeline: [],
    save: jest.fn().mockResolvedValue(undefined),
  };
  const orders: any = {
    findOne: jest.fn().mockResolvedValue(order),
    findOneAndUpdate: jest.fn().mockResolvedValue({ ...order }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
  const offerDocument: any = {
    timeline: [],
    save: jest.fn().mockResolvedValue(undefined),
    toObject() { return { ...this }; },
  };
  const offers: any = jest.fn(() => offerDocument);
  offers.findOne = jest.fn().mockResolvedValue(null);
  offers.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
  offers.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
  const allocations: any = { create: jest.fn().mockResolvedValue({ id: 'allocation-1', toObject: () => ({ id: 'allocation-1' }) }) };
  const broadcasts: any = { findOne: jest.fn().mockResolvedValue(null) };
  const inventory: any = {
    findOne: jest.fn().mockReturnValue(lean({ id: 'inventory-1', sku: 'SKU-1', name_ar: 'دواء من المخزون', stock: 6, price: 19.95 })),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
  const chats: any = { openOrGetThread: jest.fn().mockResolvedValue({ id: 'thread-1' }) };
  const models = { orders, offers, allocations, broadcasts, inventory, chats, order };
  Object.assign(models, overrides);
  return {
    service: new PharmacyOfferService(models.orders, models.offers, models.allocations, models.broadcasts, models.inventory, models.chats),
    ...models,
  };
}

describe('calculatePharmacyQuote', () => {
  it('prices available inventory lines server-side and preserves the delivery fee', () => {
    expect(calculatePharmacyQuote([
      { requested_qty: 2, offered_qty: 2, available: true, unit_price: 12.5 },
      { requested_qty: 1, offered_qty: 0, available: false, unit_price: 100 },
    ], 7.5)).toEqual({ subtotal: 25, delivery_fee: 7.5, total: 32.5, currency: 'SAR' });
  });

  it('rounds the snapshot total to two decimal places', () => {
    expect(calculatePharmacyQuote([{ requested_qty: 3, offered_qty: 3, available: true, unit_price: 6.665 }], 0.005))
      .toEqual({ subtotal: 20, delivery_fee: 0.01, total: 20.01, currency: 'SAR' });
  });

  it('rejects negative delivery fees rather than trusting a provider price payload', () => {
    expect(() => calculatePharmacyQuote([], -1)).toThrow(BadRequestException);
  });
});

describe('PharmacyOfferService', () => {
  it('rejects offer creation by an actor outside the provider scope', async () => {
    const { service } = createService();
    await expect(service.submitOffer({ id: 'patient-1', role: 'patient' }, 'order-1', { items: [{ order_item_id: 'line-1' }] }))
      .rejects.toThrow(ForbiddenException);
  });

  it('derives the accepted unit price from provider inventory, not a submitted price field', async () => {
    const { service } = createService();
    const offer = await service.submitOffer(
      { id: 'pharmacy-1', role: 'pharmacy' },
      'order-1',
      { items: [{ order_item_id: 'line-1', inventory_id: 'inventory-1', offered_qty: 2, unit_price: 0.01 } as any], delivery_fee: 4.5 },
    );

    expect(offer.items[0]).toMatchObject({ inventory_id: 'inventory-1', available: true, unit_price: 19.95 });
    expect(offer.totals).toEqual({ subtotal: 39.9, delivery_fee: 4.5, total: 44.4, currency: 'SAR' });
  });

  it('enforces patient ownership before an offer can be selected', async () => {
    const { service } = createService();
    await expect(service.selectOffer({ id: 'patient-2' }, 'order-1', 'offer-1', 'cash')).rejects.toThrow(ForbiddenException);
  });

  it('does not select an expired offer', async () => {
    const { service, offers } = createService();
    offers.findOne.mockReturnValue(lean(null));
    await expect(service.selectOffer({ id: 'patient-1' }, 'order-1', 'offer-1', 'cash')).rejects.toThrow(NotFoundException);
  });

  it('rejects an insurance selection when the offer cannot process insurance', async () => {
    const { service, offers } = createService();
    offers.findOne.mockReturnValue(lean({ id: 'offer-1', pharmacy_account_id: 'pharmacy-1', insurance_ready: false }));
    await expect(service.selectOffer({ id: 'patient-1' }, 'order-1', 'offer-1', 'insurance')).rejects.toThrow(BadRequestException);
  });

  it('rejects a competing selection when another request wins the order lock', async () => {
    const { service, offers, orders, inventory } = createService();
    offers.findOne.mockReturnValue(lean({
      id: 'offer-1', pharmacy_account_id: 'pharmacy-1', insurance_ready: true, revision: 1, snapshot_hash: 'hash',
      items: [{ order_item_id: 'line-1', inventory_id: 'inventory-1', available: true, offered_qty: 1 }], totals: { total: 19.95 },
    }));
    orders.findOneAndUpdate.mockResolvedValue(null);

    await expect(service.selectOffer({ id: 'patient-1' }, 'order-1', 'offer-1', 'cash')).rejects.toThrow('offer_selection_locked');
    expect(inventory.updateOne).not.toHaveBeenCalled();
    expect(offers.updateOne).toHaveBeenLastCalledWith(
      { id: 'offer-1', status: 'selection_pending' },
      { $set: { status: 'open', selection_lock_until: undefined } },
    );
  });

  it('refuses selection when expiry has atomically claimed the open offer first', async () => {
    const { service, offers, orders, inventory } = createService();
    offers.findOne.mockReturnValue(lean({
      id: 'offer-1', pharmacy_account_id: 'pharmacy-1', insurance_ready: true, revision: 1, snapshot_hash: 'hash',
      items: [{ order_item_id: 'line-1', inventory_id: 'inventory-1', available: true, offered_qty: 1 }], totals: { total: 19.95 },
    }));
    offers.updateOne.mockResolvedValueOnce({ modifiedCount: 0 });

    await expect(service.selectOffer({ id: 'patient-1' }, 'order-1', 'offer-1', 'cash')).rejects.toThrow('offer_selection_claim_unavailable');
    expect(orders.findOneAndUpdate).not.toHaveBeenCalled();
    expect(inventory.updateOne).not.toHaveBeenCalled();
  });

  it('releases prior reservations and clears the selection when inventory changes during selection', async () => {
    const { service, offers, orders, inventory, allocations } = createService();
    offers.findOne.mockReturnValue(lean({
      id: 'offer-1', pharmacy_account_id: 'pharmacy-1', insurance_ready: true, revision: 1, snapshot_hash: 'hash',
      items: [
        { order_item_id: 'line-1', inventory_id: 'inventory-1', available: true, offered_qty: 1 },
        { order_item_id: 'line-2', inventory_id: 'inventory-2', available: true, offered_qty: 1 },
      ],
      totals: { total: 39.9 },
    }));
    inventory.updateOne
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce({ modifiedCount: 0 })
      .mockResolvedValueOnce({ modifiedCount: 1 });

    await expect(service.selectOffer({ id: 'patient-1' }, 'order-1', 'offer-1', 'cash'))
      .rejects.toThrow('inventory_changed:line-2');

    expect(inventory.updateOne).toHaveBeenCalledTimes(3);
    expect(inventory.updateOne.mock.calls[2][1]).toEqual({ $inc: { stock: 1 } });
    expect(orders.updateOne).toHaveBeenCalledWith(
      { id: 'order-1', selected_offer_id: 'offer-1' },
      expect.objectContaining({ $unset: expect.objectContaining({ selected_offer_id: 1 }) }),
    );
    expect(allocations.create).not.toHaveBeenCalled();
  });

  it('returns the existing selection without reserving stock twice for an idempotent retry', async () => {
    const { service, orders, offers, inventory } = createService();
    orders.findOne.mockResolvedValue({ id: 'order-1', patient_account_id: 'patient-1', selected_offer_id: 'offer-1' });
    offers.findOne.mockReturnValue(lean({ id: 'offer-1', status: 'selected' }));

    await expect(service.selectOffer({ id: 'patient-1' }, 'order-1', 'offer-1', 'cash')).resolves.toEqual({ id: 'offer-1', status: 'selected' });
    expect(inventory.updateOne).not.toHaveBeenCalled();
  });

  it('accepts only the exact final quote snapshot before a cash payment can be created', async () => {
    const { service, orders } = createService();
    const snapshot = { items: [{ order_item_id: 'line-1' }], totals: { total: 39.9 }, insurance_ready: false };
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', governed_state: 'OFFER_SELECTED', negotiation_required: false,
      coverage_mode: 'cash', selected_offer_snapshot: snapshot, selected_offer_hash: 'quote-hash', selected_offer_revision: 2,
    });
    orders.findOneAndUpdate.mockResolvedValue({ id: 'order-1', governed_state: 'FINAL_QUOTE_ACCEPTED', toObject: () => ({ id: 'order-1', governed_state: 'FINAL_QUOTE_ACCEPTED' }) });

    await expect(service.acceptFinalQuote({ id: 'patient-1' }, 'order-1', 'quote-hash', 2))
      .resolves.toEqual({ id: 'order-1', governed_state: 'FINAL_QUOTE_ACCEPTED' });
    expect(orders.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ governed_state: 'OFFER_SELECTED' }),
      expect.objectContaining({ $set: expect.objectContaining({ accepted_quote_hash: 'quote-hash', accepted_quote_revision: 2 }) }),
      { new: true },
    );
  });

  it('rejects a quote acceptance when the patient submits an old or tampered revision', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', governed_state: 'FINAL_QUOTE_READY',
      pending_final_quote_snapshot: { totals: { total: 39.9 } }, pending_final_quote_hash: 'current-hash', pending_final_quote_revision: 3,
    });

    await expect(service.acceptFinalQuote({ id: 'patient-1' }, 'order-1', 'old-hash', 2)).rejects.toThrow('final_quote_mismatch');
    expect(orders.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('does not start pharmacy insurance processing without a verified policy on the order', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', governed_state: 'OFFER_SELECTED', negotiation_required: false,
      coverage_mode: 'insurance', selected_offer_snapshot: { insurance_ready: true, totals: { total: 39.9 } }, selected_offer_hash: 'quote-hash', selected_offer_revision: 2,
    });

    await expect(service.acceptFinalQuote({ id: 'patient-1' }, 'order-1', 'quote-hash', 2)).rejects.toThrow('governed_transition_rejected');
    expect(orders.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('records a complete per-item insurance decision only for the selected pharmacy', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', selected_pharmacy_account_id: 'pharmacy-1',
      governed_state: 'INSURANCE_PROCESSING', insurance_details: { policyNumber: 'P-1' },
      accepted_quote_snapshot: { items: [{ order_item_id: 'line-1', offered_qty: 2, unit_price: 10 }] },
    });
    orders.findOneAndUpdate.mockResolvedValue({ id: 'order-1', governed_state: 'INSURANCE_DECISION_READY', toObject: () => ({ id: 'order-1', governed_state: 'INSURANCE_DECISION_READY' }) });

    await expect(service.recordInsuranceDecision({ id: 'pharmacy-1', role: 'pharmacy' }, 'order-1', {
      items: [{ order_item_id: 'line-1', decision: 'APPROVED_PARTIAL', covered_amount: 16, co_pay_amount: 4, authorization_reference: 'AUTH-1' }],
    })).resolves.toEqual({ id: 'order-1', governed_state: 'INSURANCE_DECISION_READY' });
    expect(orders.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ selected_pharmacy_account_id: 'pharmacy-1', governed_state: 'INSURANCE_PROCESSING' }),
      expect.objectContaining({ $set: expect.objectContaining({ insurance_decision_summary: expect.objectContaining({ decision: 'APPROVED_PARTIAL', co_pay_amount: 4 }) }) }),
      { new: true },
    );
  });

  it('rejects incomplete item decisions and decisions from an unselected pharmacy', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', selected_pharmacy_account_id: 'pharmacy-1', governed_state: 'INSURANCE_PROCESSING',
      insurance_details: { policyNumber: 'P-1' }, accepted_quote_snapshot: { items: [{ order_item_id: 'line-1', offered_qty: 1, unit_price: 10 }] },
    });
    await expect(service.recordInsuranceDecision({ id: 'pharmacy-2', role: 'pharmacy' }, 'order-1', { items: [] })).rejects.toThrow(ForbiddenException);
    await expect(service.recordInsuranceDecision({ id: 'pharmacy-1', role: 'pharmacy' }, 'order-1', { items: [] })).rejects.toThrow('incomplete_insurance_item_decisions');
  });

  it('moves an approved co-pay to payment pending only after the patient explicitly accepts it', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', governed_state: 'INSURANCE_DECISION_READY',
      insurance_decision_summary: { decision: 'APPROVED_PARTIAL', co_pay_amount: 4 },
    });
    orders.findOneAndUpdate.mockResolvedValue({ id: 'order-1', governed_state: 'CO_PAY_PENDING', toObject: () => ({ id: 'order-1', governed_state: 'CO_PAY_PENDING' }) });

    await expect(service.acceptInsuranceCoPay({ id: 'patient-1' }, 'order-1', 'apple-pay')).resolves.toEqual({ id: 'order-1', governed_state: 'CO_PAY_PENDING' });
    expect(orders.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ governed_state: 'INSURANCE_DECISION_READY' }),
      expect.objectContaining({ $set: expect.objectContaining({ payment_method: 'apple-pay' }) }),
      { new: true },
    );
  });

  it('creates a new server-calculated self-pay quote after a partial insurance decision', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', governed_state: 'INSURANCE_DECISION_READY',
      accepted_quote_snapshot: { items: [{ order_item_id: 'line-1' }], totals: { subtotal: 20, delivery_fee: 10, total: 30, currency: 'SAR' } },
      accepted_quote_hash: 'insured-quote-hash', accepted_quote_revision: 2,
      insurance_decision_summary: { decision: 'APPROVED_PARTIAL', covered_amount: 16, co_pay_amount: 4 },
    });
    orders.findOneAndUpdate.mockResolvedValue({ id: 'order-1', governed_state: 'FINAL_QUOTE_ACCEPTED', toObject: () => ({ id: 'order-1', governed_state: 'FINAL_QUOTE_ACCEPTED' }) });

    await expect(service.acceptInsuranceSelfPay({ id: 'patient-1' }, 'order-1', 'card')).resolves.toEqual({ id: 'order-1', governed_state: 'FINAL_QUOTE_ACCEPTED' });
    expect(orders.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ governed_state: 'INSURANCE_DECISION_READY' }),
      expect.objectContaining({ $set: expect.objectContaining({ accepted_quote_revision: 3, payment_method: 'card', accepted_quote_snapshot: expect.objectContaining({ totals: { subtotal: 14, delivery_fee: 0, total: 14, currency: 'SAR' } }) }) }),
      { new: true },
    );
  });

  it('registers COD only for an eligible accepted cash quote and confirms the governed order', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', coverage_mode: 'cash', governed_state: 'FINAL_QUOTE_ACCEPTED',
      accepted_quote_snapshot: { cod_allowed: true, totals: { total: 32.5, currency: 'SAR' } }, accepted_quote_hash: 'quote-hash', accepted_quote_revision: 4,
    });
    orders.findOneAndUpdate.mockResolvedValue({ id: 'order-1', governed_state: 'CONFIRMED', toObject: () => ({ id: 'order-1', governed_state: 'CONFIRMED' }) });

    await expect(service.registerCod({ id: 'patient-1' }, 'order-1')).resolves.toEqual({ id: 'order-1', governed_state: 'CONFIRMED' });
    expect(orders.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ governed_state: 'FINAL_QUOTE_ACCEPTED', coverage_mode: 'cash' }),
      expect.objectContaining({ $set: expect.objectContaining({ payment_method: 'cod', payment_status: 'cod_pending_collection' }) }),
      { new: true },
    );
  });

  it('rejects COD when the accepted quote has no server-recorded COD eligibility', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', coverage_mode: 'cash', governed_state: 'FINAL_QUOTE_ACCEPTED',
      accepted_quote_snapshot: { cod_allowed: false, totals: { total: 32.5, currency: 'SAR' } }, accepted_quote_hash: 'quote-hash', accepted_quote_revision: 4,
    });
    await expect(service.registerCod({ id: 'patient-1' }, 'order-1')).rejects.toThrow('cod_not_eligible');
    expect(orders.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('confirms a fully covered insurance decision with zero co-pay without creating a payment step', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-1', patient_account_id: 'patient-1', selected_pharmacy_account_id: 'pharmacy-1', governed_state: 'INSURANCE_PROCESSING',
      insurance_details: { policyNumber: 'P-1' }, accepted_quote_snapshot: { items: [{ order_item_id: 'line-1', offered_qty: 1, unit_price: 10 }] },
    });
    orders.findOneAndUpdate.mockResolvedValue({ id: 'order-1', governed_state: 'CONFIRMED', toObject: () => ({ id: 'order-1', governed_state: 'CONFIRMED' }) });

    await expect(service.recordInsuranceDecision({ id: 'pharmacy-1', role: 'pharmacy' }, 'order-1', {
      items: [{ order_item_id: 'line-1', decision: 'APPROVED_FULL', covered_amount: 10, co_pay_amount: 0 }],
    })).resolves.toEqual({ id: 'order-1', governed_state: 'CONFIRMED' });
    expect(orders.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ $set: expect.objectContaining({ governed_state: 'CONFIRMED', payment_status: 'covered_by_insurance' }) }),
      { new: true },
    );
  });

  it('moves a selected offer with alternatives into governed negotiation and opens only affected item threads', async () => {
    const { service, offers, orders, chats } = createService();
    offers.findOne.mockReturnValue(lean({
      id: 'offer-1', order_id: 'order-1', patient_account_id: 'patient-1', pharmacy_account_id: 'pharmacy-1', status: 'open', expires_at: new Date(Date.now() + 10_000),
      items: [{ order_item_id: 'line-1', inventory_id: 'inventory-1', sku: 'ALT-1', name: 'بديل', requested_qty: 2, offered_qty: 2, available: true, unit_price: 19.95, alternative: { sku: 'ALT-1' } }], totals: { total: 39.9 }, snapshot_hash: 'quote-hash', revision: 1,
    }));
    orders.findOneAndUpdate.mockResolvedValue({ id: 'order-1' });

    const result = await service.selectOffer({ id: 'patient-1' }, 'order-1', 'offer-1', 'cash');
    expect(result).toEqual(expect.objectContaining({ negotiation_required: true, negotiation_thread_ids: ['thread-1'], payment_required: false }));
    expect(chats.openOrGetThread).toHaveBeenCalledWith('order-1', 'line-1', 'pharmacy-1');
    expect(orders.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ governed_state: 'OFFER_SELECTED' }),
      expect.objectContaining({ $set: { governed_state: 'NEGOTIATION_REQUIRED' } }),
    );
  });
});
