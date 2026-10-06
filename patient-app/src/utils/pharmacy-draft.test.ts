import { buildPatientPharmacyDraft, extractPatientPharmacyOrderId } from './pharmacy-draft';

describe('patient pharmacy draft', () => {
  it('maps cart identity and quantity while stripping price, payment, coupon, and points inputs', () => {
    expect(buildPatientPharmacyDraft([{ id: 'sku-1', name: 'Medicine', qty: 2, price: 99, payment_method: 'card', coupon_code: 'SAVE', loyalty_points: 200 }], { lat: 24.7, lng: 46.6 })).toEqual({ items: [{ raw_name: 'Medicine', qty: 2, sku: 'sku-1', intake_source: 'cart' }], delivery_address: { label: 'المنزل', street: '', city: '', lat: 24.7, lng: 46.6 }, prescription_attachments: [], fulfillment: 'delivery', payment_mode: 'cash' });
  });
  it('carries explicit pickup fulfillment and insurance payment mode end to end', () => {
    expect(buildPatientPharmacyDraft([{ id: 'sku-1', name: 'Medicine', qty: 1 }], { lat: 24.7, lng: 46.6 }, undefined, { fulfillment: 'pickup', payment_mode: 'insurance' })).toEqual(expect.objectContaining({ fulfillment: 'pickup', payment_mode: 'insurance' }));
  });
  it('requires a created governed pharmacy order id before submission', () => {
    expect(extractPatientPharmacyOrderId({ data: { id: 'order-1' } })).toBe('order-1');
    expect(extractPatientPharmacyOrderId({ id: '' })).toBeNull();
  });
  it('preserves a declared manual intake source while still omitting client attachment, price, and payment fields', () => {
    expect(buildPatientPharmacyDraft([{ name: 'دواء غير متوفر', qty: 1, intake_source: 'manual', price: 17, payment_method: 'card', photo_uri: 'file://local' }], { lat: 24.7, lng: 46.6 })).toEqual({ items: [{ raw_name: 'دواء غير متوفر', qty: 1, sku: undefined, intake_source: 'manual' }], delivery_address: { label: 'المنزل', street: '', city: '', lat: 24.7, lng: 46.6 }, prescription_attachments: [], fulfillment: 'delivery', payment_mode: 'cash' });
  });
  it('links the saved prescription with prescription_id, the way the web does, and only when there is one', () => {
    const lines = [{ id: 'm1', name: 'Medicine', qty: 1, intake_source: 'prescription' }];
    expect(buildPatientPharmacyDraft(lines, { lat: 24.7, lng: 46.6 }, 'rx-1', { prescription_id: 'rx-1' })).toEqual(expect.objectContaining({ prescription_id: 'rx-1', prescription_attachments: ['rx-1'] }));
    expect(buildPatientPharmacyDraft(lines, { lat: 24.7, lng: 46.6 })).not.toHaveProperty('prescription_id');
  });
});
