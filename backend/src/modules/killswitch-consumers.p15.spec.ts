/**
 * F9 (15.12) — isKilled wired into all six consumers (mocked, no mongod here).
 *
 * One toggle test per consumer: an explicitly-disabled flag forces the
 * documented degraded answer, and the kill check happens BEFORE any
 * provider/queue/pool read (those mocks throw if touched on the killed path).
 * Absent flags / store outage fail open (feature stays on) — pinned for the
 * AI gateway and the live map; the other four share the same connectionFlagSource.
 *
 * Reverting any consumer's isKilled check makes its killed test red.
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { AiGatewayService } from './ai/ai-gateway.service';
import { ProductRankingService } from './product-ranking/product-ranking.service';
import { DynamicRankingR9Service } from './product-ranking/product-ranking-r9.service';
import { EngagementController, processNudge } from './engagement/engagement.controller';
import { OpsController } from './ops/ops.controller';
import { MedicinesService } from './medicines/medicines.service';

/** Connection mock: featureflags answers from `flags`; every other collection throws. */
function flagsConn(flags: Record<string, boolean>, extra: Record<string, any> = {}) {
  const collection = jest.fn((name: string) => {
    if (name === 'featureflags') {
      return {
        findOne: jest.fn(async (q: any) => {
          const key = q?.key?.$eq ?? q?.key;
          if (!(key in flags)) return null;
          return { key, enabled: flags[key] };
        }),
      };
    }
    if (name in extra) return extra[name];
    return {
      findOne: jest.fn(async () => {
        throw new Error(`must not read ${name} on the killed path`);
      }),
      find: jest.fn(() => {
        throw new Error(`must not read ${name} on the killed path`);
      }),
      insertOne: jest.fn(async () => {
        throw new Error(`must not write ${name} on the killed path`);
      }),
    };
  });
  return { collection } as any;
}

const flush = async (n = 4) => {
  for (let i = 0; i < n; i += 1) await new Promise((r) => setImmediate(r));
};

describe('F9 kill switches wired into consumers (mocked)', () => {
  // ── 1. AI gateway ──────────────────────────────────────────────
  it('ai killed: generate() refuses before any provider call', async () => {
    const transport = jest.fn(async () => 'live-answer');
    const svc = new AiGatewayService(flagsConn({ ai_symptom_checker: false }));
    svc.setTransportForTests(transport);
    await expect(svc.generate({ prompt: 'triage please', feature: 'triage' })).rejects.toThrow(
      new ServiceUnavailableException('ai_disabled_by_kill_switch'),
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it('ai absent: generate() proceeds to providers (fail-open)', async () => {
    const transport = jest.fn(async () => 'live-answer');
    const providers = [
      { key: 'gemini', enabled: true, api_key: 'k', model: 'm', priority: 1, daily_quota: 0, used_today: 0, usage_date: '' },
    ];
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'featureflags') return { findOne: jest.fn(async () => null) };
        if (name === 'ai_providers') {
          return {
            countDocuments: jest.fn(async () => 1),
            find: jest.fn(() => ({ sort: jest.fn(() => ({ toArray: jest.fn(async () => providers) })) })),
            updateOne: jest.fn(async () => ({})),
          };
        }
        return { insertOne: jest.fn(async () => ({})), updateOne: jest.fn(async () => ({})) };
      }),
    };
    const svc = new AiGatewayService(conn);
    svc.setTransportForTests(transport);
    const r: any = await svc.generate({ prompt: 'triage please', feature: 'triage' });
    expect(r.text).toBe('live-answer');
    expect(transport).toHaveBeenCalledTimes(1);
  });

  // ── 2. recommendations (canonical ranker) ──────────────────────
  it('recommendations killed: non-personalized default list, no ZSet hydration', async () => {
    const zadd = jest.fn(async () => 0);
    const redis: any = { zcard: jest.fn(), zrevrange: jest.fn(), zadd };
    let capturedSort: any = null;
    const metricsModel: any = {
      find: jest.fn(() => ({
        sort: jest.fn((s: any) => {
          capturedSort = s;
          return {
            skip: jest.fn(() => ({
              limit: jest.fn(() => ({
                exec: async () => [{ drug_id: 'd-b' }, { drug_id: 'd-a' }],
              })),
            })),
          };
        }),
      })),
      countDocuments: jest.fn(() => ({ exec: async () => 2 })),
    };
    const svc = new ProductRankingService(
      metricsModel,
      redis,
      flagsConn({ recommendations_enabled: false }) as any,
    );
    const r = await svc.getRankedDrugIds({ sort: 'smart_ranking', limit: 20 });
    expect(r).toEqual({ drugIds: ['d-b', 'd-a'], total: 2 });
    expect(capturedSort).toEqual({ drug_id: 1 }); // catalog order, not a score
    expect(redis.zcard).not.toHaveBeenCalled(); // never reads behavior signals
    expect(zadd).not.toHaveBeenCalled(); // never poisons the cache degraded
  });

  it('recommendations on: ranked path untouched', async () => {
    const redis: any = {
      zcard: jest.fn(async () => 3),
      zrevrange: jest.fn(async () => ['d-1']),
      zadd: jest.fn(),
    };
    const metricsModel: any = { find: jest.fn(), countDocuments: jest.fn() };
    const svc = new ProductRankingService(metricsModel, redis, flagsConn({}) as any);
    const r = await svc.getRankedDrugIds({ sort: 'smart_ranking', limit: 20 });
    expect(r).toEqual({ drugIds: ['d-1'], total: 3 });
    expect(metricsModel.find).not.toHaveBeenCalled();
  });

  // ── 2b. recommendations (R9 Redis-only path) ───────────────────
  it('R9 killed: empty degraded list without touching Redis', async () => {
    const redis: any = {
      zcard: jest.fn(async () => {
        throw new Error('must not read redis on the killed path');
      }),
      zrevrange: jest.fn(),
    };
    const svc = new DynamicRankingR9Service(redis, flagsConn({ recommendations_enabled: false }) as any);
    const r = await svc.getRankedIds({ mode: 'smart' });
    expect(r.ids).toEqual([]);
    expect(r.total).toBe(0);
    expect(redis.zcard).not.toHaveBeenCalled();
  });

  // ── 3. engagement / nudges ─────────────────────────────────────
  it('nudges killed: event recorded, nothing enqueued', async () => {
    const insertOne = jest.fn(async () => ({}));
    const conn = flagsConn(
      { nudges_enabled: false },
      { user_interest_events: { insertOne } },
    );
    const queue: any = { add: jest.fn() };
    const ctl = new EngagementController(conn, queue, {} as any);
    const r: any = await ctl.trackEvent(
      { id: 'u-1' },
      { kind: 'browse', locale: 'ar' } as any,
    );
    expect(r.nudges_killed).toBe(true);
    expect(insertOne).toHaveBeenCalledTimes(1); // analytics record kept
    expect(queue.add).not.toHaveBeenCalled(); // ...but nothing scheduled
  });

  it('nudges killed: already-queued jobs are dropped, never sent', async () => {
    const conn = flagsConn({ nudges_enabled: false });
    const notifications: any = { create: jest.fn() };
    await processNudge(conn, notifications, 'evt-1');
    expect(notifications.create).not.toHaveBeenCalled();
  });

  // ── 4. live map ────────────────────────────────────────────────
  it('live map killed: static degraded answer, no collection scans', async () => {
    const conn = flagsConn({ live_map_enabled: false });
    const ctl = new OpsController(conn, {} as any);
    const r: any = await ctl.liveMap('200');
    expect(r.points).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.live_map_killed).toBe(true);
    expect(conn.collection).toHaveBeenCalledTimes(1); // only the flag read
  });

  it('live map absent: proceeds to live scans (fail-open)', async () => {
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'featureflags') return { findOne: jest.fn(async () => null) };
        return {
          find: jest.fn(() => ({
            project: jest.fn(() => ({
              sort: jest.fn(() => ({
                limit: jest.fn(() => ({
                  toArray: async () => [],
                })),
              })),
            })),
          })),
        };
      }),
    };
    const ctl = new OpsController(conn, {} as any);
    const r: any = await ctl.liveMap('200');
    expect(r.live_map_killed).toBeUndefined();
    expect(conn.collection).toHaveBeenCalled();
  });

  // ── 5. analytics ingestion ─────────────────────────────────────
  it('analytics ingestion killed: search digitally drops the write, results unaffected', async () => {
    const insertOne = jest.fn(async () => ({}));
    const conn = flagsConn(
      { analytics_ingestion_enabled: false },
      { search_queries: { insertOne } },
    );
    const svc = new MedicinesService({} as any, { emit: jest.fn() } as any, {} as any, conn, {} as any);
    (svc as any).trackSearch('paracetamol', 5, 'u-1');
    await flush();
    expect(insertOne).not.toHaveBeenCalled();
  });

  it('analytics ingestion on: search_queries write happens', async () => {
    const insertOne = jest.fn(async () => ({}));
    const conn = flagsConn(
      { analytics_ingestion_enabled: true },
      { search_queries: { insertOne } },
    );
    const svc = new MedicinesService({} as any, { emit: jest.fn() } as any, {} as any, conn, {} as any);
    (svc as any).trackSearch('paracetamol', 5, 'u-1');
    await flush();
    expect(insertOne).toHaveBeenCalledTimes(1);
  });

  // ── 6. search suggestions ──────────────────────────────────────
  it('search suggestions killed: direct-matches-only answer, no pool reads', async () => {
    let poolTouched = false;
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'featureflags') {
          return { findOne: jest.fn(async () => ({ key: 'search_suggestions_enabled', enabled: false })) };
        }
        poolTouched = true;
        throw new Error(`must not read ${name} on the killed path`);
      }),
    };
    const svc = new MedicinesService({} as any, { emit: jest.fn() } as any, {} as any, conn, {} as any);
    const r: any = await svc.didYouMean('paracetmol');
    expect(r).toEqual({ suggestion: null, alternatives: [], query: 'paracetmol' });
    expect(poolTouched).toBe(false);
  });
});
