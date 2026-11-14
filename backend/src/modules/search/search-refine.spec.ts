import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { refineItems, hasRefine } from './search-refine';
import { toSearchDocument } from './search-documents';
import { SearchQueryDto } from './search.controller';

const APPROVED = { public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved' };
const items = [
  { id: 'a', price: 30, old_price: 40 },
  { id: 'b', price: 10, old_price: null },
  { id: 'c', price: null, old_price: null },
  { id: 'd', price: 20, old_price: 20 },
];

describe('search sort, price range and sale filter (#1819)', () => {
  it('does nothing without a refinement (relevance order kept)', () => {
    expect(hasRefine({})).toBe(false);
    expect(hasRefine({ sort: 'relevance' })).toBe(false);
    expect(refineItems(items, { sort: 'relevance' })).toBe(items);
  });

  it('sorts by price both ways, items without a price last, equal prices keep the engine order', () => {
    expect(refineItems(items, { sort: 'price_asc' }).map((i) => i.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(refineItems(items, { sort: 'price_desc' }).map((i) => i.id)).toEqual(['a', 'd', 'b', 'c']);
    const tie = [{ id: 'x', price: 5 }, { id: 'y', price: 5 }];
    expect(refineItems(tie, { sort: 'price_asc' }).map((i) => i.id)).toEqual(['x', 'y']);
  });

  it('a price range excludes items without a price; on_sale needs a real reduction', () => {
    expect(refineItems(items, { price_min: 15, price_max: 30 }).map((i) => i.id)).toEqual(['a', 'd']);
    expect(refineItems(items, { price_max: 10 }).map((i) => i.id)).toEqual(['b']);
    expect(refineItems(items, { on_sale: true }).map((i) => i.id)).toEqual(['a']);
  });

  it('documents carry old_price only for a real reduction and never on a prescription item', () => {
    expect(toSearchDocument('medicines', { id: 'm', name_en: 'M', price: 10, old_price: 15, ...APPROVED })!.old_price).toBe(15);
    expect(toSearchDocument('medicines', { id: 'm', name_en: 'M', price: 10, old_price: 8, ...APPROVED })!.old_price).toBeNull();
    expect(toSearchDocument('medicines', { id: 'm', name_en: 'M', price: 10, old_price: 15, requires_prescription: true, ...APPROVED })!.old_price).toBeNull();
    expect(toSearchDocument('medicines', { id: 'm', name_en: 'M', ...APPROVED })!.old_price).toBeNull();
  });

  it('the query validates sort, price and on_sale', async () => {
    const ok = plainToInstance(SearchQueryDto, { q: 'x', sort: 'price_asc', price_min: '10', price_max: '99.50', on_sale: 'true' });
    expect(await validate(ok)).toHaveLength(0);
    for (const bad of [{ sort: 'cheapest' }, { price_min: '-1' }, { price_max: 'abc' }, { price_min: '1e9' }, { on_sale: 'false' }]) {
      expect((await validate(plainToInstance(SearchQueryDto, bad))).length).toBeGreaterThan(0);
    }
  });
});
