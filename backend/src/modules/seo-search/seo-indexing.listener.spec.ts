import { SeoIndexingListener } from './seo-indexing.listener';

describe('SeoIndexingListener (R24)', () => {
  const listener = (ok: boolean) => {
    const seo = { pingIndexNow: jest.fn().mockResolvedValue({ ok }) };
    const pipeline = { invalidateCaches: jest.fn().mockResolvedValue(undefined) };
    return { l: new SeoIndexingListener(seo as any, pipeline as any), seo, pipeline };
  };

  it('pings doctor + facility indexes on provider approval', async () => {
    const { l, seo } = listener(true);
    await l.onApproved({ provider_id: 'p1' });
    expect(seo.pingIndexNow).toHaveBeenCalledTimes(2);
  });

  it('skips silently when id is missing (no crash, no ping)', async () => {
    const { l, seo } = listener(true);
    await l.onApproved({});
    await l.onRejected(undefined as any).catch(() => null);
    expect(seo.pingIndexNow).not.toHaveBeenCalled();
  });

  it('never throws when the ping backend is down', async () => {
    const seo = { pingIndexNow: jest.fn().mockRejectedValue(new Error('down')) };
    const pipeline = { invalidateCaches: jest.fn().mockResolvedValue(undefined) };
    const l = new SeoIndexingListener(seo as any, pipeline as any);
    await expect(l.onSuspended({ provider_id: 'p9' })).resolves.toBeUndefined();
  });
});

describe('SeoIndexingListener 13.R6 provider lifecycle propagation (mocked, no DB)', () => {
  const setup = () => {
    const seo = { pingIndexNow: jest.fn().mockResolvedValue({ ok: true }) };
    const pipeline = { invalidateCaches: jest.fn().mockResolvedValue(undefined) };
    const l = new SeoIndexingListener(seo as any, pipeline as any);
    return { l, seo, pipeline };
  };

  it('suspend fans out to search + sitemap/cache/MCP invalidation', async () => {
    const { l, seo, pipeline } = setup();
    await l.onSuspended({ provider_id: 'prov-1' });
    // (1) search: IndexNow push for doctor + facility discovery
    expect(seo.pingIndexNow).toHaveBeenCalledWith('doctor', 'prov-1');
    expect(seo.pingIndexNow).toHaveBeenCalledWith('facility', 'prov-1');
    // (2/3/4) sitemap + cache + MCP: shared invalidateCaches hook covers
    // seo:sitemap:xml, public:catalog:*, seo:resolve:*, seo:llms:txt, mcp:entities:cache
    const types = pipeline.invalidateCaches.mock.calls.map((c: any[]) => c[0]);
    for (const t of ['doctor', 'pharmacy', 'nursing']) expect(types).toContain(t);
    expect(pipeline.invalidateCaches).toHaveBeenCalledWith(expect.anything(), 'prov-1');
  });

  it('reactivate restores discovery via the same four propagations', async () => {
    const { l, seo, pipeline } = setup();
    await l.onReactivated({ provider_id: 'prov-2' });
    await l.onAdminReactivated({ provider_id: 'prov-2' });
    expect(seo.pingIndexNow).toHaveBeenCalledWith('doctor', 'prov-2');
    expect(seo.pingIndexNow).toHaveBeenCalledWith('facility', 'prov-2');
    expect(pipeline.invalidateCaches).toHaveBeenCalledWith(expect.anything(), 'prov-2');
  });

  it('never throws when every propagation backend is down', async () => {
    const seo = { pingIndexNow: jest.fn().mockRejectedValue(new Error('down')) };
    const pipeline = { invalidateCaches: jest.fn().mockRejectedValue(new Error('down')) };
    const l = new SeoIndexingListener(seo as any, pipeline as any);
    await expect(l.onSuspended({ provider_id: 'p9' })).resolves.toBeUndefined();
    await expect(l.onReactivated({ provider_id: 'p9' })).resolves.toBeUndefined();
  });
});
