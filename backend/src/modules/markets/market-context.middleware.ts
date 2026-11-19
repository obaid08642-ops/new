import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { runWithMarketContext, MarketContext } from './market-context';
import { SA_CONFIG_V1, SA_MARKET, SA_MARKET_ID } from './sa-market.seed';

export const MARKET_HEADER = 'x-market';
const SERVED: ReadonlySet<string> = new Set(['pilot', 'live', 'internal_test']);

interface Req { headers: Record<string, string | string[] | undefined>; path?: string; originalUrl?: string }

/** Probes and discovery documents need no market (and must not touch the database): /health/*, the API root probe, /.well-known/*. The backend serves no static files. */
const NO_MARKET_PATH = /^\/(?:api\/?(?:v\d+\/?)?$|(?:api\/)?(?:v\d+\/)?health(?:\/|$)|\.well-known(?:\/|$))/;
export function skipsMarketContext(path: string | undefined): boolean {
  return typeof path === 'string' && NO_MARKET_PATH.test(path.split('?')[0]);
}

/**
 * Puts a MarketContext on every request. Resolution: a client hint (`X-Market`, ISO alpha-2) is only a hint: it must be a
 * market that exists and is served, otherwise 400 (never silently the default). With no hint the platform's launch market
 * (SA) applies, as before. If the market tables cannot be read, the SA built-in config is used so a database hiccup never
 * changes Saudi behaviour. Later steps add the account market and provider/order market before the hint.
 */
@Injectable()
export class MarketContextMiddleware implements NestMiddleware {
  constructor(private readonly markets: MarketsService) {}

  async use(req: Req, _res: unknown, next: (err?: unknown) => void): Promise<void> {
    if (skipsMarketContext(req.originalUrl ?? req.path)) return next();
    let ctx: MarketContext;
    try {
      ctx = await this.resolve(req);
    } catch (err) {
      if (err instanceof BadRequestException) return next(err);
      ctx = this.fallback();
    }
    runWithMarketContext(ctx, () => next());
  }

  private async resolve(req: Req): Promise<MarketContext> {
    const raw = req.headers[MARKET_HEADER];
    const hint = (Array.isArray(raw) ? raw[0] : raw)?.trim().toUpperCase();
    if (hint !== undefined && hint !== '' && !/^[A-Z]{2}$/.test(hint)) throw new BadRequestException('market_not_available');
    const id = hint || SA_MARKET_ID;
    let market;
    try { market = await this.markets.getMarket(id); } catch (e) {
      if (hint) throw new BadRequestException('market_not_available');
      throw e;
    }
    if (hint && !SERVED.has(market.status)) throw new BadRequestException('market_not_available');
    const resolved = await this.markets.getConfig(id);
    return {
      market_id: market.id, country: market.country, operator_id: market.operator_id,
      currency: resolved.config.currency.code, timezone: resolved.config.timezone,
      config_version: resolved.version, source: hint ? 'header' : 'default', config: resolved.config,
    };
  }

  private fallback(): MarketContext {
    return {
      market_id: SA_MARKET.id, country: SA_MARKET.country, operator_id: SA_MARKET.operator_id,
      currency: SA_CONFIG_V1.currency.code, timezone: SA_CONFIG_V1.timezone, config_version: 1, source: 'default', config: SA_CONFIG_V1,
    };
  }
}
