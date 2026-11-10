import { MedicinesService } from './medicines.service';
import { MedicinesController, MAX_CATALOGUE_STREAMS } from './medicines.controller';

// Run 113 (2026-11-10): mongod was OOM-killed again and again while the public filter lists and the catalogue stream read every public medicine (about 20 KB each) in parallel.
describe('GET /medicines/filters is built once per refresh for the fleet', () => {
  const distinct = jest.fn(async (field: string) => ({ category: ['a', null, 'b'], manufacturer: ['M1'], form: ['tablet'] } as Record<string, any>)[field]);
  const make = (hotCache?: any) => new MedicinesService({ distinct } as any, { emit: jest.fn() } as any, { getClient: () => null } as any, {} as any, {} as any, undefined as any, undefined as any, undefined as any, undefined as any, hotCache);

  beforeEach(() => distinct.mockClear());

  it('goes through HotCache under one key, and the scans run only when HotCache asks for the value', async () => {
    let stored: any = null; let builds = 0;
    const hotCache = { get: jest.fn(async (_k: string, _o: any, load: () => Promise<any>) => { if (!stored) { builds++; stored = await load(); } return stored; }) };
    const svc = make(hotCache);
    const a = await svc.filters(); const b = await svc.filters(); const c = await svc.filters();
    expect(hotCache.get).toHaveBeenCalledTimes(3);
    expect(hotCache.get.mock.calls[0][0]).toBe('med:filters-governed-v1');
    expect(hotCache.get.mock.calls[0][1]).toEqual({ ttl: 1800, swr: 3600 });
    expect(builds).toBe(1);
    expect(distinct).toHaveBeenCalledTimes(3);   // category, manufacturer, form: once, not once per request
    expect(a).toBe(b); expect(b).toBe(c);
    expect(a).toMatchObject({ categories: ['a', 'b'], brands: ['M1'], forms: ['tablet'] });
  });

  it('without HotCache (a tool or a test) it still answers', async () => {
    await expect(make().filters()).resolves.toMatchObject({ categories: ['a', 'b'], brands: ['M1'], forms: ['tablet'] });
  });
});

describe('GET /medicines/stream serves a few full catalogue reads at a time', () => {
  it(`the ${MAX_CATALOGUE_STREAMS + 1}th at once is told to come back (503 catalogue_stream_busy), and the slot is free again afterwards`, async () => {
    let release!: () => void; const gate = new Promise<void>((r) => { release = r; });
    const cursor = { [Symbol.asyncIterator]: async function* () { await gate; yield { id: 'm1' }; } };
    const query: any = { lean: () => query, batchSize: () => query, cursor: () => cursor };
    const svc: any = { publicStreamFilter: () => ({}), model: { find: () => query } };
    const controller = new MedicinesController(svc);
    const mkRes = () => { const chunks: string[] = []; const raw: any = { headersSent: false, write: (c: string) => { chunks.push(c); }, end: jest.fn(), writeHead: jest.fn() }; return { raw, chunks }; };
    const open = Array.from({ length: MAX_CATALOGUE_STREAMS }, () => { const r = mkRes(); return { r, done: controller.streamCatalog(undefined, undefined, undefined, r.raw) }; });
    await new Promise((r) => setTimeout(r, 10));
    const busy = mkRes();
    await controller.streamCatalog(undefined, undefined, undefined, busy.raw);
    expect(busy.raw.writeHead).toHaveBeenCalledWith(503, expect.objectContaining({ 'Retry-After': '5' }));
    expect(busy.raw.end).toHaveBeenCalledWith(JSON.stringify({ error: 'catalogue_stream_busy' }));
    release();
    await Promise.all(open.map((o) => o.done));
    expect(open[0].r.chunks.join('')).toContain('"items":[');
    const again = mkRes();
    await controller.streamCatalog(undefined, undefined, undefined, again.raw);
    expect(again.raw.writeHead).not.toHaveBeenCalled();
  });
});
