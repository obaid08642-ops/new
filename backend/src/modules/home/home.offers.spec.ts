import { HomeService } from './home.service';

// Needs-review issue 751: GET /home/offers carries the English title and never a "NaN%" discount.
describe('HomeService offers', () => {
  const service = (rows: any[]) => {
    const promoModel: any = {
      find: () => ({ limit: () => ({ exec: async () => rows }) }),
      db: { collection: () => ({ find: () => ({ toArray: async () => [] }) }) },
    };
    return new HomeService(promoModel, {} as any, { user: { id: 'p-1' } });
  };

  it('sends title_en as t_en next to the Arabic t', async () => {
    const [o] = await service([{ id: 'of-1', title_ar: 'عرض اختبار', title_en: 'Test offer', original_price: 100, discounted_price: 80 }]).getOffers();
    expect(o).toMatchObject({ t: 'عرض اختبار', t_en: 'Test offer', disc: '20%' });
  });

  it('sends no discount when the original price is 0', async () => {
    const [o] = await service([{ id: 'of-2', title_ar: 'عرض اختبار', original_price: 0, discounted_price: 0 }]).getOffers();
    expect(o.disc).toBeNull();
  });
});
