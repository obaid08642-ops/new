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

describe('MarketsService.getConfig cache and `at`', () => {
  const rows = () => [
    { market_id: 'SA', version: 1, effective_from: new Date('2026-01-01'), status: 'active', config: cfg('SAR') },
    { market_id: 'SA', version: 2, effective_from: new Date('2026-06-01'), status: 'active', config: cfg('USD') },
  ];
  it('caches "now" reads: a second call does not hit the database', async () => {
    const { svc, configs } = make(rows());
    await svc.getConfig('SA');
    await svc.getConfig('SA');
    expect(configs.find).toHaveBeenCalledTimes(1);
  });
  it('a past `at` bypasses the cache, returns the version effective then, and does not poison the cache', async () => {
    const { svc, configs } = make(rows());
    const now = await svc.getConfig('SA');
    expect(now.version).toBe(2);
    const past = await svc.getConfig('SA', new Date('2026-03-01'));
    expect(past.version).toBe(1);
    expect(configs.find).toHaveBeenCalledTimes(2);
    expect((await svc.getConfig('SA')).version).toBe(2); // cached "now" untouched by the past read
    expect(configs.find).toHaveBeenCalledTimes(2);
  });
  it('a past read first does not fill the cache with the old version', async () => {
    const { svc } = make(rows());
    expect((await svc.getConfig('SA', new Date('2026-03-01'))).version).toBe(1);
    expect((await svc.getConfig('SA')).version).toBe(2);
  });
  it('publishing clears the cache so the new version is served at once', async () => {
    const { svc } = make(rows(), [{ id: 'SA' }]);
    expect((await svc.getConfig('SA')).version).toBe(2);
    await svc.publishConfig('SA', cfg('EUR'), new Date(Date.now() - 1000), 't');
    expect((await svc.getConfig('SA')).version).toBe(3);
  });
});
