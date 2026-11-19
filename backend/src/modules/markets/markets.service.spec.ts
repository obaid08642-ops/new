import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MarketsService, pickActiveVersion } from './markets.service';
import { SA_CONFIG_V1 } from './sa-market.seed';
import { MarketConfig } from './market-config.types';

const cfg = (code: string): MarketConfig => ({ ...SA_CONFIG_V1, currency: { code, exponent: 2 } });

describe('pickActiveVersion', () => {
  const rows = [
    { version: 1, effective_from: new Date('2026-01-01'), config: cfg('SAR') },
    { version: 2, effective_from: new Date('2026-06-01'), config: cfg('USD') },
    { version: 3, effective_from: new Date('2027-01-01'), config: cfg('EUR') },
  ];
  it('takes the highest version already effective', () => {
    expect(pickActiveVersion(rows, new Date('2026-07-01'))?.version).toBe(2);
    expect(pickActiveVersion(rows, new Date('2027-02-01'))?.version).toBe(3);
  });
  it('is null before anything is effective', () => expect(pickActiveVersion(rows, new Date('2025-01-01'))).toBeNull());
});

function make(rows: Array<{ market_id: string; version: number; effective_from: Date; status: string; config: MarketConfig }> = [], markets: Array<{ id: string }> = []) {
  const calls: string[] = [];
  const operators = { updateOne: jest.fn(async () => { calls.push('op'); }) };
  const mk = {
    updateOne: jest.fn(async () => { calls.push('market'); }),
    findOne: jest.fn((q: { id: string }) => ({ lean: async () => markets.find((m) => m.id === q.id) ?? null })),
  };
  const configs = {
    updateOne: jest.fn(async () => { calls.push('config'); }),
    find: jest.fn((q: { market_id: string }) => ({ lean: async () => rows.filter((r) => r.market_id === q.market_id && r.status === 'active') })),
    findOne: jest.fn((q: { market_id: string }) => ({ sort: () => ({ lean: async () => rows.filter((r) => r.market_id === q.market_id).sort((a, b) => b.version - a.version)[0] ?? null }) })),
    create: jest.fn(async (r: never) => { rows.push(r); }),
  };
  const svc = new MarketsService(mk as never, operators as never, configs as never);
  return { svc, operators, mk, configs, calls, rows };
}

describe('MarketsService', () => {
  it('seeds SA with $setOnInsert only (never overwrites)', async () => {
    const { svc, configs, operators, mk } = make();
    await svc.seedSaudi();
    for (const m of [operators.updateOne, mk.updateOne, configs.updateOne]) {
      const [, update, opts] = (m.mock.calls[0] as unknown) as [unknown, Record<string, unknown>, { upsert: boolean }];
      expect(Object.keys(update)).toEqual(['$setOnInsert']);
      expect(opts.upsert).toBe(true);
    }
  });
  it('serves SA config from the built-in v1 on an unseeded database, byte-equal to the seed', async () => {
    const { svc } = make();
    const r = await svc.getConfig('SA');
    expect(r.version).toBe(1);
    expect(JSON.stringify(r.config)).toBe(JSON.stringify(SA_CONFIG_V1));
  });
  it('serves SA from the stored row when seeded', async () => {
    const { svc } = make([{ market_id: 'SA', version: 1, effective_from: new Date(0), status: 'active', config: SA_CONFIG_V1 }]);
    expect(JSON.stringify((await svc.getConfig('SA')).config)).toBe(JSON.stringify(SA_CONFIG_V1));
  });
  it('refuses an unknown market', async () => {
    const { svc } = make();
    await expect(svc.getConfig('EG')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.getMarket('EG')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('publishes the next version after validation, and refuses an invalid config', async () => {
    const { svc, rows } = make([{ market_id: 'SA', version: 1, effective_from: new Date(0), status: 'active', config: SA_CONFIG_V1 }], [{ id: 'SA' }]);
    const bad = { ...SA_CONFIG_V1, timezone: 'Mars/Base' };
    await expect(svc.publishConfig('SA', bad, new Date(), 'tester')).rejects.toBeInstanceOf(BadRequestException);
    const v = await svc.publishConfig('SA', SA_CONFIG_V1, new Date(Date.now() - 1000), 'tester');
    expect(v).toBe(2);
    expect(rows).toHaveLength(2);
    expect((await svc.getConfig('SA')).version).toBe(2);
  });
});
