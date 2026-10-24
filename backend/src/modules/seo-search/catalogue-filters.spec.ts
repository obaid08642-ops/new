import { catalogueFilterClauses } from './catalogue-filters';
import { SeoSearchService } from './seo-search.module';

describe('category listing filters (form, brand, rx, price)', () => {
  it('builds escaped, bounded clauses and ignores what does not parse', () => {
    const { and, price } = catalogueFilterClauses({ form: 'tab(let', brand: 'Pfizer', rx: 'true', price_min: '10', price_max: '50' }, 'ar');
    expect(and).toEqual([
      { $or: [{ form: { $regex: 'tab\\(let', $options: 'i' } }] },
      { manufacturer: { $regex: 'Pfizer', $options: 'i' } },
      { $or: [{ requires_prescription: true }, { is_rx: true }] },
    ]);
    expect(price).toEqual({ $gte: 10, $lte: 50 });
    const none = catalogueFilterClauses({ form: '\u0000', brand: '  ', rx: 'maybe', price_min: 'abc', price_max: '-5' }, 'en');
    expect(none).toEqual({ and: [], price: null });
  });

  it('a max below the min is ignored, other locales also match the translated form, rx=false excludes Rx items', () => {
    expect(catalogueFilterClauses({ price_min: '50', price_max: '10' }, 'en').price).toEqual({ $gte: 50 });
    expect(catalogueFilterClauses({ form: 'قرص' }, 'ur').and[0]).toEqual({ $or: [{ form: { $regex: 'قرص', $options: 'i' } }, { 'translations.ur.form': { $regex: 'قرص', $options: 'i' } }] });
    expect(catalogueFilterClauses({ rx: 'false' }, 'ar').and).toEqual([{ requires_prescription: { $ne: true }, is_rx: { $ne: true } }]);
  });

  it('reaches the query: the listing ANDs the clauses and keeps no-price items out of a price range', async () => {
    let seen: any;
    const col = { find: (f: any) => { seen = f; return { sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => [] }) }) }) }; }, countDocuments: async () => 0 };
    const svc: any = Object.create(SeoSearchService.prototype);
    svc.conn = { collection: () => col };
    svc.publicProductFilter = () => ({ approved: true });
    svc.publicListingCount = async () => 0;
    await svc.publicCategoryProducts('en', 'all', undefined, 1, 24, undefined, 'popular', { rx: 'true', price_max: '30' });
    expect(seen.$and).toEqual([{ $or: [{ requires_prescription: true }, { is_rx: true }] }]);
    expect(seen.price).toEqual({ $lte: 30, $gt: 0 });
  });
});
