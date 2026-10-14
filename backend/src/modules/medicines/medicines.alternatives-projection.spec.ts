import { MedicinesService } from './medicines.service';

// Needs-review issue 460: the alternatives of a medicine carry a picture, the pack size and the names in every language.
describe('MedicinesService.details alternatives projection', () => {
  it('asks for image, package size and the four translated names', async () => {
    const med = { id: 'm1', name_ar: 'أ', name_en: 'A', active_ingredient: 'paracetamol', toObject() { return this; } };
    const find = jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) });
    const model: any = { findOne: jest.fn().mockResolvedValue(med), find, updateOne: jest.fn().mockReturnValue({ catch: () => undefined }) };
    const conn: any = { collection: () => ({ insertOne: () => ({ catch: () => undefined }) }) };
    const service = new MedicinesService(model, { emit: jest.fn() } as any, { getClient: () => null } as any, conn, {} as any);
    jest.spyOn(service as any, 'aggregateStock').mockResolvedValue({ aggregate_stock: 0, pharmacies_count: 0 });
    await service.details('m1').catch(() => undefined);
    const projection = find.mock.calls[0][1];
    expect(projection).toMatchObject({ image_1: 1, package_size: 1, 'translations.ur.name': 1, 'translations.hi.name': 1, 'translations.bn.name': 1, 'translations.tl.name': 1 });
    expect(projection.images).toEqual({ $slice: 1 });
  });
});
