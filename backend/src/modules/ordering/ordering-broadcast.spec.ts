import { NotFoundException } from '@nestjs/common';
import { OrderingBroadcastService } from './ordering-broadcast.service';

// M4 pieces that need no database: the stage configuration is sanitised, and a provider that was not reached learns nothing.
function make(config: unknown, broadcast: unknown = null) {
  const conn: any = {
    collection: jest.fn((name: string) => {
      if (name === 'system_configs') return { findOne: jest.fn(async () => (config === undefined ? null : { value: config })) };
      return { findOne: jest.fn(async () => broadcast), find: jest.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }), limit: () => ({ toArray: async () => [] }) })) };
    }),
  };
  return new OrderingBroadcastService(conn, {} as never, {} as never);
}

describe('M4 broadcast: configuration and reach', () => {
  it('uses 3 / 5 / 8 km at 3 minutes without a configuration', async () => {
    const stages = await (make(undefined) as any).stagesConfig();
    expect(stages).toEqual([{ radius_km: 3, timeout_seconds: 180 }, { radius_km: 5, timeout_seconds: 180 }, { radius_km: 8, timeout_seconds: 180 }]);
  });

  it('keeps valid stages (at most 3) and drops invalid ones', async () => {
    const raw = [{ radius_km: 2, timeout_seconds: 30 }, { radius_km: -1, timeout_seconds: 30 }, { radius_km: 4, timeout_seconds: 0 }, { radius_km: 6, timeout_seconds: 60 }, { radius_km: 9, timeout_seconds: 60 }, { radius_km: 12, timeout_seconds: 60 }];
    expect(await (make(raw) as any).stagesConfig()).toEqual([{ radius_km: 2, timeout_seconds: 30 }, { radius_km: 6, timeout_seconds: 60 }, { radius_km: 9, timeout_seconds: 60 }]);
  });

  it('falls back to the defaults when nothing valid is configured', async () => {
    expect(await (make('nonsense') as any).stagesConfig()).toHaveLength(3);
    expect(await (make([{ radius_km: 'x' }]) as any).stagesConfig()).toHaveLength(3);
  });

  it('a provider that was never reached gets 404 on accept and on offer, nothing about the broadcast', async () => {
    const svc = make(undefined, null);
    await expect(svc.providerAccept({ id: 'p1' }, 'ab_x')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.providerOffer({ id: 'p1' }, 'pb_x', { items: [{ name: 'x', price: 1 }] })).rejects.toBeInstanceOf(NotFoundException);
  });
});
