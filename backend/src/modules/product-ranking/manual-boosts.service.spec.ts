import { ManualBoostsService } from './manual-boosts.service';

describe('ManualBoostsService (R77)', () => {
  it('returns active boost entity ids only', async () => {
    const rows = [{ entity_id: 'm1' }, { entity_id: 'm2' }];
    const boosts = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) }) };
    const svc = new ManualBoostsService(boosts as any);
    const ids = await svc.activeIds();
    expect(ids.has('m1')).toBe(true);
    expect(ids.has('m2')).toBe(true);
    expect(boosts.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
      expect.objectContaining({ entity_id: 1 }),
    );
  });

  it('returns an empty set when the store is unreachable', async () => {
    const boosts = { find: jest.fn().mockImplementation(() => { throw new Error('down'); }) };
    const svc = new ManualBoostsService(boosts as any);
    await expect(svc.activeIds()).resolves.toEqual(new Set());
  });
});
