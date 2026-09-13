import { SeoIndexingListener } from './seo-indexing.listener';

describe('SeoIndexingListener (R24)', () => {
  const listener = (ok: boolean) => {
    const seo = { pingIndexNow: jest.fn().mockResolvedValue({ ok }) };
    return { l: new SeoIndexingListener(seo as any), seo };
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
    const l = new SeoIndexingListener(seo as any);
    await expect(l.onSuspended({ provider_id: 'p9' })).resolves.toBeUndefined();
  });
});
