import { MedicinesService } from './medicines.service';

// B-4 (#945): the change log covers every edited field, not just the price.
// Price keeps its legacy before_price/after_price row; every other changed
// field gets its own { field, before, after } row in the same history read.
describe('MedicinesService admin change log (every field)', () => {
  const priceRows: any[] = [];
  const make = (med: any) => {
    const model: any = {
      findOne: jest.fn().mockResolvedValue(med),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const conn: any = {
      collection: jest.fn(() => ({ insertOne: jest.fn(async (doc: any) => { priceRows.push(doc); return {}; }) })),
    };
    const service = new MedicinesService(model as any, { emit: jest.fn() } as any, {} as any, conn as any, {} as any);
    return { service, model };
  };
  const med = () => ({
    id: 'med-1', name_ar: 'دواء', price: 80, manufacturer: 'OldCo',
    medical_review_status: 'pending',
  });

  beforeEach(() => { priceRows.length = 0; jest.clearAllMocks(); });

  it('logs a generic row for a non-price field change', async () => {
    const { service } = make(med());
    await service.adminUpdateCatalog('med-1', { manufacturer: 'NewCo', reason: 'fix data' }, 'adm-1');
    const generic = priceRows.filter((r) => r.field === 'manufacturer');
    expect(generic).toHaveLength(1);
    expect(generic[0]).toMatchObject({
      medicine_id: 'med-1', field: 'manufacturer', before: 'OldCo', after: 'NewCo', changed_by: 'adm-1',
    });
  });

  it('price changes keep the legacy before_price/after_price shape', async () => {
    const { service } = make(med());
    await service.adminUpdateCatalog('med-1', { price: 90, reason: 'new official price' }, 'adm-1');
    const legacy = priceRows.filter((r) => r.before_price !== undefined);
    expect(legacy).toHaveLength(1);
    expect(legacy[0]).toMatchObject({ before_price: 80, after_price: 90 });
    expect(priceRows.filter((r) => r.field === 'price')).toHaveLength(0);
  });

  it('unchanged fields produce no rows', async () => {
    const { service } = make(med());
    await service.adminUpdateCatalog('med-1', { manufacturer: 'OldCo', reason: 'no-op edit' }, 'adm-1');
    expect(priceRows.filter((r) => r.field === 'manufacturer')).toHaveLength(0);
  });
});
