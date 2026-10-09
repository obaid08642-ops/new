import { PharmacyOfferService } from './pharmacy-offer.service';

// Needs-review #509: a pharmacy registered with business_name (no display name) is named on its offer.
describe('PharmacyOfferService patient offer name', () => {
  it('falls back to the registered business name', async () => {
    const offer = { id: 'of-1', order_id: 'o-1', pharmacy_account_id: 'ph-1', version: 1, status: 'submitted', items: [] };
    const lean = (v: unknown) => ({ lean: async () => v, sort: () => ({ lean: async () => v }) });
    const orders: any = { findOne: () => lean({ id: 'o-1', patient_account_id: 'p-1', delivery_address: {} }) };
    const offers: any = { find: () => lean([offer]) };
    const connection: any = { collection: () => ({ findOne: async () => ({ account_id: 'ph-1', business_name: 'صيدلية الشفاء' }) }) };
    const service = new PharmacyOfferService(connection, offers, orders, {} as any, {} as any, {} as any, {} as any, {} as any);
    const [out]: any[] = await service.listForPatient({ id: 'p-1' }, 'o-1');
    expect(out.pharmacy_name_ar).toBe('صيدلية الشفاء');
    expect(out.pharmacy_name_en).toBe('صيدلية الشفاء');
  });
});
