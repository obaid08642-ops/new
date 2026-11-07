import { createShareLink, listShareLinks, revokeShareLink } from './receiptLinks';

const o = { kind: 'lab' as const, bookingId: 'b-1', days: 7, lang: 'ar' };

describe('the share-link calls', () => {
  it('creates a link with the chosen days and returns the web page address, not the API one', async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fetcher = (async (url: string, init?: RequestInit) => { calls.push([url, init]); return { id: 'l1', token: 'tok-abc', expires_at: '2026-11-08T00:00:00Z', url: 'https://api/x/pdf' }; }) as never;
    expect(await createShareLink(o, fetcher)).toEqual({ ok: true, id: 'l1', url: 'https://nabd.plus/ar/receipt/shared/tok-abc', expiresAt: '2026-11-08T00:00:00Z' });
    expect(calls[0][0]).toBe('/billing/invoice/lab/b-1/share-link');
    expect(calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ expires_in_days: 7 }) });
  });
  it('tells a rate limit from a failure', async () => {
    expect(await createShareLink(o, (async () => { throw new Error('share_link_rate_limited'); }) as never)).toEqual({ ok: false, reason: 'limit' });
    expect(await createShareLink(o, (async () => { throw new Error('too_many_active_share_links'); }) as never)).toEqual({ ok: false, reason: 'limit' });
    expect(await createShareLink(o, (async () => { throw new Error('OFFLINE_ERROR'); }) as never)).toEqual({ ok: false, reason: 'failed' });
    expect(await createShareLink(o, (async () => ({ id: 'l1' })) as never)).toEqual({ ok: false, reason: 'failed' });
  });
  it('lists and revokes through the receipt paths', async () => {
    const seen: Array<[string, string | undefined]> = [];
    const fetcher = (async (url: string, init?: RequestInit) => { seen.push([url, init?.method]); return [{ id: 'l1', status: 'revoked', view_count: 2 }]; }) as never;
    expect((await listShareLinks('lab', 'b-1', fetcher))?.[0]).toMatchObject({ id: 'l1', status: 'revoked', viewCount: 2 });
    expect(await revokeShareLink('lab', 'b-1', 'l1', fetcher)).toBe(true);
    expect(seen).toEqual([['/billing/invoice/lab/b-1/share-links', undefined], ['/billing/invoice/lab/b-1/share-links/l1', 'DELETE']]);
    expect(await listShareLinks('lab', 'b-1', (async () => { throw new Error('x'); }) as never)).toBeNull();
    expect(await revokeShareLink('lab', 'b-1', 'l1', (async () => { throw new Error('404'); }) as never)).toBe(false);
  });
});
