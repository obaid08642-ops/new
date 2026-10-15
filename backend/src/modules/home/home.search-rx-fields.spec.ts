import { HomeService } from './home.service';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';

// rx-rules: GET /home/search medicine rows carry requires_prescription and online_exclusive (decisions 10 and 11).
function serviceFor(medicines: any[]) {
  const service: any = Object.create(HomeService.prototype);
  service.promoModel = {
    find: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
    db: {
      collection: jest.fn((name: string) => ({
        find: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(name === CATALOG_COLLECTIONS.medicines ? medicines : []) }),
          toArray: jest.fn().mockResolvedValue([]),
        }),
        findOne: jest.fn().mockResolvedValue(null),
      })),
    },
  };
  service.request = { user: { id: 'pat-1' } };
  return service as HomeService;
}

describe('home search medicine rows (rx-rules)', () => {
  it('sends requires_prescription and online_exclusive for each medicine', async () => {
    const service = serviceFor([
      { id: 'rx', name_ar: 'أ', name_en: 'A', price: 10, requires_prescription: true },
      { id: 'online', name_ar: 'ب', name_en: 'B', price: 5, online_exclusive: true },
      { id: 'legacy-rx', name_ar: 'ج', name_en: 'C', price: 7, is_rx: true },
      { id: 'plain', name_ar: 'د', name_en: 'D', price: 3 },
    ]);
    const rows: any[] = await service.globalSearch('دواء');
    const meds = rows.filter((r) => r.typeEn === 'Medicine').map((r) => [r.id, r.requires_prescription, r.online_exclusive]);
    expect(meds).toEqual([['rx', true, false], ['online', false, true], ['legacy-rx', true, false], ['plain', false, false]]);
  });
});
