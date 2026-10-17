import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { PUBLIC_KEY } from '../../common/auth.guard';

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

// Issue 1550: a guest sees the offers before signing in; the patient's own reads on this controller stay private.
describe('HomeController offers is a public read', () => {
  const isPublic = (name: 'getOffers' | 'getUpcomingAppointment') => Reflect.getMetadata(PUBLIC_KEY, HomeController.prototype[name]) === true;

  it('marks GET /home/offers public', () => {
    expect(isPublic('getOffers')).toBe(true);
  });

  it('keeps the upcoming appointment behind the sign-in', () => {
    expect(isPublic('getUpcomingAppointment')).toBe(false);
  });

  it('sends nothing about the reader, only the campaign and the provider\'s public name', async () => {
    const promoModel: any = {
      find: () => ({ limit: () => ({ exec: async () => [{ id: 'of-3', title_ar: 'عرض', original_price: 50, discounted_price: 40, provider_id: 'pv-1' }] }) }),
      db: { collection: () => ({ find: () => ({ toArray: async () => [{ id: 'pv-1', name_ar: 'مركز', rating_avg: 4.5, email: 'x@y.z', iban: 'SA00' }] }) }) },
    };
    const [o] = await new HomeService(promoModel, {} as any, {}).getOffers();
    expect(Object.keys(o).sort()).toEqual(['c', 'disc', 'ic', 'id', 'old', 'price', 'prov', 'rating', 'sponsored', 't', 't_en']);
  });
});
