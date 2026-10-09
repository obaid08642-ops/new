import { MedicinesService } from './medicines.service';

// Needs-review #500: the public barcode lookup must not run the typed code as a regular expression.
describe('MedicinesService.byBarcode fuzzy fallback', () => {
  it('escapes the typed code before the name / ingredient regex', async () => {
    const lean = jest.fn().mockResolvedValue(null);
    const model = { findOne: jest.fn().mockReturnValue({ lean }) };
    const service = new MedicinesService(model as any, { emit: jest.fn() } as any, { getClient: () => null } as any, {} as any, {} as any);
    await service.byBarcode('(a+)+$');
    const fuzzy = model.findOne.mock.calls.map((c: any[]) => c[0]).find((q: any) => q.$or);
    expect(fuzzy.$or[0].name_en.$regex).toBe('\\(a\\+\\)\\+\\$');
    expect(fuzzy.$or[1].active_ingredient.$regex).toBe('\\(a\\+\\)\\+\\$');
  });
});

// Needs-review #449: an empty catalogue offers no form filters.
describe('MedicinesService.filters', () => {
  it('returns only forms present in the catalogue', async () => {
    const model = { distinct: jest.fn().mockResolvedValue([]) };
    const service = new MedicinesService(model as any, { emit: jest.fn() } as any, { getClient: () => null } as any, {} as any, {} as any);
    await expect(service.filters()).resolves.toMatchObject({ categories: [], brands: [], forms: [] });
  });
});
