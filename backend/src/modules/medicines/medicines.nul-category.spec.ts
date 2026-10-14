import { MedicinesService } from './medicines.service';

// Fuzz gate (15.6): a category filter containing NUL/control bytes must not
// reach MongoDB (it throws → 500). It sanitizes to a plain string that
// matches nothing (200 []).
describe('MedicinesService category NUL-byte hardening', () => {
  const make = (rows: any[] = []) => {
    const find = jest.fn().mockResolvedValue(rows);
    const model: any = { find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(rows) }) }) };
    const conn: any = { collection: jest.fn(() => ({ insertOne: jest.fn().mockResolvedValue({}) })) };
    const redis: any = { getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn().mockResolvedValue(undefined) };
    const service = new MedicinesService(model as any, { emit: jest.fn() } as any, redis as any, conn as any, {} as any);
    return { service, model, find };
  };

  it('strips NUL bytes from the category before querying', async () => {
    const { service, model } = make([]);
    await service.list(undefined, '{\x00ABC');
    const query = model.find.mock.calls[0][0];
    expect(JSON.stringify(query)).not.toMatch(/\u0000/);
  });

  it('a sanitized garbage category matches nothing instead of throwing', async () => {
    const { service } = make([]);
    await expect(service.list(undefined, '{\x00ABC')).resolves.toEqual([]);
  });

  it('a normal category still resolves through the canonical map', async () => {
    const { service, model } = make([]);
    await service.list(undefined, 'vitamins');
    const query = model.find.mock.calls[0][0];
    expect(JSON.stringify(query)).toContain('الفيتامينات والتغذية الصحية');
  });
});
