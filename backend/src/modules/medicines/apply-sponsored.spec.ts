import { MedicinesService } from './medicines.service';

describe('MedicinesService.applySponsored (R77)', () => {
  const createService = (boosts: any) => {
    const service = new MedicinesService({} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
    (service as any).manualBoosts = boosts;
    return service;
  };

  it('flags boosted ids without reordering', async () => {
    const service = createService({ activeIds: jest.fn().mockResolvedValue(new Set(['m2'])) });
    const items = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] as any[];
    const out = await (service as any).applySponsored(items);
    expect(out.map((m: any) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(out[1].sponsored).toBe(true);
    expect(out[0].sponsored).toBeUndefined();
  });

  it('returns items untouched when the boost layer is absent or down', async () => {
    const service = createService(null);
    const items = [{ id: 'm1' }] as any[];
    await expect((service as any).applySponsored(items)).resolves.toEqual(items);
    const down = createService({ activeIds: jest.fn().mockRejectedValue(new Error('down')) });
    await expect((down as any).applySponsored(items)).resolves.toEqual(items);
  });
});
