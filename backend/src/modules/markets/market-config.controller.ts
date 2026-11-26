import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../common/auth.guard';
import { currentMarketContext } from './market-context';
import { marketClientConfig, MarketClientConfig } from './market-client-config';
import { MarketsService } from './markets.service';
import { SA_MARKET_ID } from './sa-market.seed';

/**
 * GET /config/market: the market the SERVER resolved for this request (X-Market is only a validated hint), as clients need it: currency, time zone, phone rules,
 * emergency number, address template, "operated by" text. Clients read this instead of holding Saudi constants. Public, like /config.
 */
@Controller('config/market')
@Public()
export class MarketConfigController {
  constructor(private readonly markets: MarketsService) {}

  @Get()
  async get(): Promise<MarketClientConfig> {
    const ctx = currentMarketContext();
    if (ctx) return marketClientConfig(ctx);
    // No context (the middleware skipped this path): resolve the launch market directly.
    try {
      const market = await this.markets.getMarket(SA_MARKET_ID);
      const resolved = await this.markets.getConfig(SA_MARKET_ID);
      return marketClientConfig({ market_id: market.id, country: market.country, operator_id: market.operator_id, currency: resolved.config.currency.code, timezone: resolved.config.timezone, config_version: resolved.version, source: 'default', config: resolved.config });
    } catch {
      throw new ServiceUnavailableException('market_config_unavailable');
    }
  }
}
