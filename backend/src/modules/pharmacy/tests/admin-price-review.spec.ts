import { NotFoundException } from '@nestjs/common';
import { AdminPharmacyController } from '../pharmacy.controllers';

// Decision 12 (needs-review admin-catalogue#19): the admin "items to review" queue lists offer lines with no catalogue
// match or above the catalogue price, with the pharmacy name and whether a not-verified line matches a catalogue item.
describe('AdminPharmacyController price-review queue', () => {
  const review = {
    id: 'rv1', order_id: 'o1', offer_id: 'of1', pharmacy_account_id: 'ph1', status: 'open', updatedAt: new Date(),
    lines: [
      { order_item_id: 'i1', medicine_id: null, sku: 'LOCAL-1', name_ar: 'كريم محلي', reason: 'not_verified', offered_price: 30 },
      { order_item_id: 'i2', medicine_id: null, sku: 'med-9', name_ar: 'دواء', reason: 'not_verified', offered_price: 12 },
    ],
  };
  const updateOne = jest.fn();
  const make = () => {
    const conn: any = {
      collection: (name: string) => ({
        find: jest.fn((q: any) => ({
          sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => [review] }) }) }),
          toArray: async () => {
            if (name === 'provider_profiles') return q.account_id.$in.includes('ph1') ? [{ account_id: 'ph1', display_name_ar: 'صيدلية النور', display_name_en: 'Al Noor' }] : [];
            if (name === 'medicines') return [{ id: 'med-9' }];
            return [];
          },
        })),
        countDocuments: jest.fn(async () => 1),
        updateOne,
      }),
    };
    return new AdminPharmacyController({} as any, {} as any, {} as any, {} as any, conn);
  };

  beforeEach(() => updateOne.mockReset());

  it('names the pharmacy and marks which not-verified lines match a catalogue item', async () => {
    const r = await make().priceReview({ reason: 'not_verified' });
    expect(r.total).toBe(1);
    expect(r.items[0]).toEqual(expect.objectContaining({ pharmacy_name_ar: 'صيدلية النور', pharmacy_name_en: 'Al Noor', order_id: 'o1' }));
    expect(r.items[0].lines.map((l: any) => l.catalogue_item_id)).toEqual([null, 'med-9']);
  });

  it('closes an open review and records who closed it', async () => {
    updateOne.mockResolvedValue({ matchedCount: 1 });
    await expect(make().closePriceReview('rv1', 'adm-1')).resolves.toEqual({ ok: true, id: 'rv1', status: 'closed' });
    expect(updateOne.mock.calls[0][0]).toEqual({ id: { $eq: 'rv1' }, status: 'open' });
    expect(updateOne.mock.calls[0][1].$set).toEqual(expect.objectContaining({ status: 'closed', closed_by: 'adm-1' }));
  });

  it('answers 404 for an unknown or already closed review', async () => {
    updateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(make().closePriceReview('nope', 'adm-1')).rejects.toThrow(NotFoundException);
  });
});
