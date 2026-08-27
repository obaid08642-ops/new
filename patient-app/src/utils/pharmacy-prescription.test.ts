import { mapPrescriptionToPharmacyDraftLines } from './pharmacy-prescription';

describe('pharmacy prescription intake', () => {
  it('maps only server prescription identity, name, and quantity without carrying price or payment data', () => {
    expect(mapPrescriptionToPharmacyDraftLines({ id: 'rx-1', items: [{ medicine_id: 'sku-1', medicine_name_ar: 'دواء', quantity: 2, price: 42, payment_method: 'card' }] })).toEqual([{ id: 'sku-1', sku: 'sku-1', name: 'دواء', qty: 2, intake_source: 'prescription' }]);
  });
});
