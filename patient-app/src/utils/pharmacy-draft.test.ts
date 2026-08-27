import { buildPatientPharmacyDraft, extractPatientPharmacyOrderId } from './pharmacy-draft';

describe('patient pharmacy draft', () => {
  it('maps cart identity and quantity while stripping price, payment, coupon, and points inputs', () => {
    expect(buildPatientPharmacyDraft([{ id: 'sku-1', name: 'Medicine', qty: 2, price: 99, payment_method: 'card', coupon_code: 'SAVE', loyalty_points: 200 }], { lat: 24.7, lng: 46.6 })).toEqual({ items: [{ raw_name: 'Medicine', qty: 2, sku: 'sku-1', intake_source: 'cart' }], delivery_address: { label: 'المنزل', street: '', city: '', lat: 24.7, lng: 46.6 }, prescription_attachments: [] });
  });
  it('requires a created governed pharmacy order id before submission', () => {
    expect(extractPatientPharmacyOrderId({ data: { id: 'order-1' } })).toBe('order-1');
    expect(extractPatientPharmacyOrderId({ id: '' })).toBeNull();
  });
  it('preserves a declared manual intake source while still omitting client attachment, price, and payment fields', () => {
    expect(buildPatientPharmacyDraft([{ name: 'دواء غير متوفر', qty: 1, intake_source: 'manual', price: 17, payment_method: 'card', photo_uri: 'file://local' }], { lat: 24.7, lng: 46.6 })).toEqual({ items: [{ raw_name: 'دواء غير متوفر', qty: 1, sku: undefined, intake_source: 'manual' }], delivery_address: { label: 'المنزل', street: '', city: '', lat: 24.7, lng: 46.6 }, prescription_attachments: [] });
  });
});
