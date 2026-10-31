import { SearchService } from './search.service';
import { MeiliClient } from './meili.client';

/** Run 70: meilisearch in a crash loop (782 restarts, killed at its own memory limit). Every worker boot pushed the whole index again, on top of whatever the engine still had queued. */

function docs(n: number) {
  return Array.from({ length: n }, (_, i) => ({ key: `k${i}`, id: `id${i}`, type: 'medicine', names: { en: `n${i}` } }));
}

function service(all: number, meili: any) {
  const svc: any = Object.create(SearchService.prototype);
  const rows = docs(all);
  svc.log = { log: jest.fn(), warn: jest.fn() };
  svc.meili = meili;
  svc.meiliReady = true;
  svc.syncingMeili = false;
  Object.defineProperty(svc, 'index', {                         // `index` is a getter on the class
    value: {
      countDocuments: jest.fn().mockResolvedValue(all),
      find: jest.fn(() => ({ [Symbol.asyncIterator]: async function* () { for (const r of rows) yield r; } })),
    },
  });
  svc.meiliCall = async (fn: (m: any) => Promise<unknown>) => { try { await fn(meili); return true; } catch { return false; } };
  return svc;
}

describe('boot sync of meilisearch from the MongoDB index', () => {
  it('sends nothing while the engine still has work queued (it would pile on top of what killed it)', async () => {
    const meili = { state: jest.fn().mockResolvedValue({ documents: 10, backlog: 37 }), upsertAndWait: jest.fn(), upsert: jest.fn() };
    const svc = service(1200, meili);
    await svc['syncMeiliFromIndex']();
    expect(meili.upsertAndWait).not.toHaveBeenCalled();
    expect(meili.upsert).not.toHaveBeenCalled();
    expect(svc.log.warn).toHaveBeenCalledWith(expect.stringContaining('37 task(s) waiting or running'));
  });

  it('sends nothing when the engine already holds every document (a restart of the worker costs nothing)', async () => {
    const meili = { state: jest.fn().mockResolvedValue({ documents: 1200, backlog: 0 }), upsertAndWait: jest.fn(), upsert: jest.fn() };
    const svc = service(1200, meili);
    await svc['syncMeiliFromIndex']();
    expect(meili.upsertAndWait).not.toHaveBeenCalled();
    expect(svc.log.log).toHaveBeenCalledWith(expect.stringContaining('already holds all 1200 documents'));
  });

  it('sends what is missing in batches of 500, one at a time, each waited for', async () => {
    let inFlight = 0; let maxInFlight = 0; const sizes: number[] = [];
    const meili = {
      state: jest.fn().mockResolvedValue({ documents: null, backlog: 0 }),
      upsertAndWait: jest.fn(async (b: unknown[]) => { inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight); sizes.push(b.length); await new Promise((r) => setTimeout(r, 5)); inFlight -= 1; }),
      upsert: jest.fn(),
    };
    const svc = service(1200, meili);
    await svc['syncMeiliFromIndex']();
    expect(sizes).toEqual([500, 500, 200]);
    expect(maxInFlight).toBe(1);
    expect(meili.upsert).not.toHaveBeenCalled();                   // never the fire-and-forget form
    expect(svc.log.log).toHaveBeenCalledWith(expect.stringContaining('1200 documents sent'));
  });

  it('stops at the first batch the engine does not take, and does not keep sending into a dead engine', async () => {
    const meili = { state: jest.fn().mockResolvedValue({ documents: 0, backlog: 0 }), upsertAndWait: jest.fn().mockRejectedValue(new Error('meilisearch task 9 failed')), upsert: jest.fn() };
    const svc = service(1200, meili);
    await svc['syncMeiliFromIndex']();
    expect(meili.upsertAndWait).toHaveBeenCalledTimes(1);
    expect(svc.log.warn).toHaveBeenCalledWith(expect.stringContaining('sync stopped after 0 documents'));
  });

  it('does not start a second sync while one runs, and skips when the state cannot be read', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const meili = { state: jest.fn().mockResolvedValue({ documents: null, backlog: 0 }), upsertAndWait: jest.fn(() => gate), upsert: jest.fn() };
    const svc = service(600, meili);
    const first = svc['syncMeiliFromIndex']();
    await new Promise((r) => setTimeout(r, 10));
    await svc['syncMeiliFromIndex']();                             // returns at once
    expect(meili.state).toHaveBeenCalledTimes(1);
    release(); await first;
    const down = service(10, { state: jest.fn().mockRejectedValue(new Error('meilisearch GET /tasks: 503')), upsertAndWait: jest.fn(), upsert: jest.fn() });
    await down['syncMeiliFromIndex']();
    expect(down.log.warn).toHaveBeenCalledWith(expect.stringContaining('state unreadable'));
  });
});

describe('MeiliClient.state and upsertAndWait', () => {
  const res = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

  it('state: documents and the number of tasks waiting or running; null documents when the index does not exist', async () => {
    const calls: string[] = [];
    const fake = async (url: string) => {
      calls.push(url);
      if (url.includes('/stats')) return res({ numberOfDocuments: 1234 });
      return res({ total: 5, results: [] });
    };
    const c = new MeiliClient('http://meili:7700', 'k', fake as any);
    expect(await c.state()).toEqual({ documents: 1234, backlog: 5 });
    expect(calls.some((u) => u.endsWith('/tasks?statuses=enqueued,processing&limit=1'))).toBe(true);
    const missing = new MeiliClient('http://meili:7700', 'k', (async (url: string) => (url.includes('/stats') ? res({}, 404) : res({ total: 0 }))) as any);
    expect(await missing.state()).toEqual({ documents: null, backlog: 0 });
    const down = new MeiliClient('http://meili:7700', 'k', (async () => res({}, 503)) as any);
    await expect(down.state()).rejects.toThrow('503');
  });

  it('upsertAndWait: waits until the task succeeded, throws when it fails or never finishes', async () => {
    let polls = 0;
    const ok = new MeiliClient('http://meili:7700', 'k', (async (url: string, init?: any) => {
      if (init?.method === 'POST') return res({ taskUid: 7 });
      polls += 1;
      return res({ status: polls < 3 ? 'processing' : 'succeeded' });
    }) as any);
    await ok.upsertAndWait([{ key: 'a' } as any], 5_000, 1);
    expect(polls).toBe(3);
    const failed = new MeiliClient('http://meili:7700', 'k', (async (_u: string, init?: any) => (init?.method === 'POST' ? res({ taskUid: 8 }) : res({ status: 'failed' }))) as any);
    await expect(failed.upsertAndWait([{ key: 'a' } as any], 5_000, 1)).rejects.toThrow('task 8 failed');
    const stuck = new MeiliClient('http://meili:7700', 'k', (async (_u: string, init?: any) => (init?.method === 'POST' ? res({ taskUid: 9 }) : res({ status: 'processing' }))) as any);
    await expect(stuck.upsertAndWait([{ key: 'a' } as any], 30, 5)).rejects.toThrow('still not done');
    await ok.upsertAndWait([], 10, 1);                              // nothing to send: no call
  });
});
