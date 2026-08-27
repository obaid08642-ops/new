import { BadRequestException } from '@nestjs/common';
import { PharmacyPaymentEvidenceService } from '../services/pharmacy-payment-evidence.service';

describe('PharmacyPaymentEvidenceService', () => {
  function setup(orderPatch: any = {}) {
    const order = {
      id: 'order-1', patient_account_id: 'patient-1', selected_offer_id: 'offer-1', selected_offer_version: 2,
      status: 'offers_selected', pricing_snapshot: { offer_id: 'offer-1', offer_version: 2, hash: 'hash-1', totals: { total: 75, currency: 'SAR' } },
      ...orderPatch,
    };
    const evidence: any[] = [];
    const paymentCollection: any = {
      updateOne: jest.fn(async (filter: any, update: any) => {
        const found = evidence.find(row => row.gateway === filter.gateway && row.gateway_payment_id === filter.gateway_payment_id && row.webhook_event_id === filter.webhook_event_id);
        if (!found) evidence.push(update.$setOnInsert);
        return { acknowledged: true, upsertedCount: found ? 0 : 1 };
      }),
      findOne: jest.fn(async (filter: any) => evidence.find(row => row.gateway === filter.gateway && row.gateway_payment_id === filter.gateway_payment_id && row.webhook_event_id === filter.webhook_event_id) || null),
    };
    const conn: any = { collection: jest.fn((name: string) => name === 'pharmacy_orders' ? { findOne: jest.fn(async (filter: any) => filter.id === order.id ? order : null) } : paymentCollection) };
    return { service: new PharmacyPaymentEvidenceService(conn), paymentCollection, evidence };
  }
  const payload = (patch: any = {}) => ({
    id: 'event-1', gateway_payment_id: 'pay-1', amount_halalas: 7500, currency: 'SAR',
    metadata: { order_id: 'order-1', selected_offer_id: 'offer-1', selected_offer_version: 2, quote_snapshot_hash: 'hash-1', payer_account_id: 'patient-1' },
    ...patch,
  });

  it('writes exact canonical evidence and treats the same gateway event as idempotent', async () => {
    const { service, paymentCollection, evidence } = setup();
    await expect(service.recordVerifiedGatewayPayment('moyasar', payload())).resolves.toMatchObject({ recorded: true, order_id: 'order-1' });
    await expect(service.recordVerifiedGatewayPayment('moyasar', payload())).resolves.toMatchObject({ recorded: true });
    expect(paymentCollection.updateOne).toHaveBeenCalledTimes(2);
    expect(evidence).toHaveLength(1);
  });

  it.each([
    [{ metadata: { order_id: 'other-order', selected_offer_id: 'offer-1', selected_offer_version: 2, quote_snapshot_hash: 'hash-1', payer_account_id: 'patient-1' } }, 'pharmacy_order_not_found'],
    [{ metadata: { order_id: 'order-1', selected_offer_id: 'other-offer', selected_offer_version: 2, quote_snapshot_hash: 'hash-1', payer_account_id: 'patient-1' } }, 'payment_selected_offer_mismatch'],
    [{ metadata: { order_id: 'order-1', selected_offer_id: 'offer-1', selected_offer_version: 2, quote_snapshot_hash: 'wrong', payer_account_id: 'patient-1' } }, 'payment_quote_hash_mismatch'],
    [{ amount_halalas: 7600 }, 'payment_amount_mismatch'],
    [{ currency: 'USD' }, 'payment_currency_mismatch'],
  ])('rejects forged payment fields (%s)', async (patch, code) => {
    const { service } = setup();
    await expect(service.recordVerifiedGatewayPayment('moyasar', payload(patch))).rejects.toThrow(code);
  });

  it('rejects incomplete metadata instead of accepting provider/client assertions', async () => {
    const { service } = setup();
    await expect(service.recordVerifiedGatewayPayment('moyasar', { id: 'event-1', amount_halalas: 7500 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
