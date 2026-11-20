import { BadRequestException } from '@nestjs/common';
import { MarketContextMiddleware, skipsMarketContext } from './market-context.middleware';
import { MarketsService } from './markets.service';
import { currentMarketContext, requireMarketContext, runWithMarketContext } from './market-context';
import { marketScopeHook, MarketScopeError, ALL_MARKETS_OPTION } from './market-scope';
import { SA_CONFIG_V1 } from './sa-market.seed';

function mw(markets: Record<string, { id: string; country: string; operator_id: string; status: string }>, dbDown = false) {
  const svc = {
    getMarket: jest.fn(async (id: string) => { if (dbDown) throw new Error('db down'); const m = markets[id]; if (!m) { const { NotFoundException } = await import('@nestjs/common'); throw new NotFoundException('market_not_found'); } return m; }),
    getConfig: jest.fn(async () => ({ market_id: 'x', version: 1, config: SA_CONFIG_V1 })),
  };
  return new MarketContextMiddleware(svc as never);
}
const SA = { id: 'SA', country: 'SA', operator_id: 'op-sa-default', status: 'live' };
const run = (m: MarketContextMiddleware, headers: Record<string, string | string[]> = {}) =>
  new Promise<{ err?: unknown; ctx?: ReturnType<typeof currentMarketContext> }>((resolve) => {
    void m.use({ headers }, {}, (err?: unknown) => resolve({ err, ctx: currentMarketContext() }));
  });

describe('MarketContextMiddleware', () => {
  it('no hint: the launch market SA, source default', async () => {
    const { ctx } = await run(mw({ SA }));
    expect(ctx).toMatchObject({ market_id: 'SA', currency: 'SAR', timezone: 'Asia/Riyadh', source: 'default', config_version: 1 });
  });
  it('a hint for a served market is accepted', async () => {
    const { ctx } = await run(mw({ SA, EG: { id: 'EG', country: 'EG', operator_id: 'op-eg', status: 'pilot' } }), { 'x-market': ' eg ' });
    expect(ctx?.market_id).toBe('EG');
    expect(ctx?.source).toBe('header');
  });
  it.each([['XX'], ['EGY'], ['1'], ['E G']])('refuses a bad or unknown hint %p (never silently SA)', async (h) => {
    const { err } = await run(mw({ SA }), { 'x-market': h });
    expect(err).toBeInstanceOf(BadRequestException);
  });
  it('refuses a market that is not served yet (draft/suspended)', async () => {
    const { err } = await run(mw({ SA, EG: { id: 'EG', country: 'EG', operator_id: 'op-eg', status: 'draft' } }), { 'x-market': 'EG' });
    expect(err).toBeInstanceOf(BadRequestException);
  });
  it('database failure never changes Saudi behaviour: falls back to the built-in SA context', async () => {
    const { ctx, err } = await run(mw({}, true));
    expect(err).toBeUndefined();
    expect(ctx).toMatchObject({ market_id: 'SA', currency: 'SAR' });
  });
  it('a hint with the database down is refused, not defaulted', async () => {
    const { err } = await run(mw({}, true), { 'x-market': 'SA' });
    expect(err).toBeInstanceOf(BadRequestException);
  });
});

describe('market context storage', () => {
  it('is empty outside a request and requireMarketContext throws', () => {
    expect(currentMarketContext()).toBeUndefined();
    expect(() => requireMarketContext()).toThrow('market_context_missing');
  });
});

describe('marketScopeHook', () => {
  const q = (filter: Record<string, unknown>, options: Record<string, unknown> = {}) => {
    const where = jest.fn();
    return { where, getFilter: () => filter, getOptions: () => options, model: { collection: { name: 'orders' } } };
  };
  const ctx = { market_id: 'SA', country: 'SA', operator_id: 'o', currency: 'SAR', timezone: 'Asia/Riyadh', config_version: 1, source: 'default' as const, config: SA_CONFIG_V1 };

  it('refuses a query with no market in the filter and no context', () => {
    expect(() => marketScopeHook.call(q({ status: 'x' }) as never)).toThrow(MarketScopeError);
  });
  it('applies the request market when the filter has none', () => {
    const query = q({ status: 'x' });
    runWithMarketContext(ctx, () => marketScopeHook.call(query as never));
    expect(query.where).toHaveBeenCalledWith({ market_id: 'SA' });
  });
  it('leaves an explicit market_id alone', () => {
    const query = q({ market_id: 'EG' });
    runWithMarketContext(ctx, () => marketScopeHook.call(query as never));
    expect(query.where).not.toHaveBeenCalled();
  });
  it('the explicit all-markets option skips the guard', () => {
    expect(() => marketScopeHook.call(q({}, { [ALL_MARKETS_OPTION]: true }) as never)).not.toThrow();
  });
});

describe('market context is skipped for probes', () => {
  it.each([['/api/v1/health/liveness'], ['/api/v1/health/readiness?x=1'], ['/health/liveness'], ['/api/v1'], ['/api/v1/'], ['/.well-known/oauth-authorization-server']])('skips %s', (p) => {
    expect(skipsMarketContext(p)).toBe(true);
  });
  it.each([['/api/v1/orders'], ['/api/v1/healthcare'], ['/api/v1/users/me'], [undefined]])('does not skip %s', (p) => {
    expect(skipsMarketContext(p as string | undefined)).toBe(false);
  });
  it('does not read the database or set a context for a probe', async () => {
    const svc = { getMarket: jest.fn(), getConfig: jest.fn() };
    const m = new MarketContextMiddleware(svc as never);
    const out = await new Promise<{ ctx: unknown }>((resolve) => { void m.use({ headers: {}, originalUrl: '/api/v1/health/liveness' }, {}, () => resolve({ ctx: currentMarketContext() })); });
    expect(out.ctx).toBeUndefined();
    expect(svc.getMarket).not.toHaveBeenCalled();
  });
});

describe('MarketsService.getMarket cache (hot path)', () => {
  const mk = (found: unknown) => {
    const findOne = jest.fn(() => ({ lean: async () => found }));
    return { svc: new MarketsService({ findOne } as never, {} as never, {} as never), findOne };
  };
  it('two requests = one database read (positive)', async () => {
    const { svc, findOne } = mk({ id: 'SA', country: 'SA', operator_id: 'o', status: 'live' });
    await svc.getMarket('SA');
    await svc.getMarket('SA');
    expect(findOne).toHaveBeenCalledTimes(1);
  });
  it('two requests for an unknown market = one database read (not-found is cached too)', async () => {
    const { svc, findOne } = mk(null);
    await expect(svc.getMarket('EG')).rejects.toThrow('market_not_found');
    await expect(svc.getMarket('EG')).rejects.toThrow('market_not_found');
    expect(findOne).toHaveBeenCalledTimes(1);
  });
  it('the cache expires after 60 s', async () => {
    const { svc, findOne } = mk({ id: 'SA', country: 'SA', operator_id: 'o', status: 'live' });
    const now = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now);
    await svc.getMarket('SA');
    spy.mockReturnValue(now + 61_000);
    await svc.getMarket('SA');
    expect(findOne).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
