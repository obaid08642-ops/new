import { Injectable, Logger, NotFoundException, OnModuleInit, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Market, MarketConfigRow, MarketConfigRowDocument, MarketDocument, Operator, OperatorDocument } from './markets.schema';
import { MarketConfig, MarketInfo } from './market-config.types';
import { validateMarketConfig } from './market-config.validate';
import { SA_CONFIG_V1, SA_MARKET, SA_MARKET_ID, SA_OPERATOR } from './sa-market.seed';

export interface ConfigVersion { version: number; effective_from: Date; config: MarketConfig }
export interface ResolvedMarketConfig { market_id: string; version: number; config: MarketConfig }

/** The row in force at `at`: highest version that is active and already effective. Pure. */
export function pickActiveVersion(rows: ConfigVersion[], at: Date): ConfigVersion | null {
  const live = rows.filter((r) => r.effective_from.getTime() <= at.getTime());
  if (live.length === 0) return null;
  return live.reduce((a, b) => (b.version > a.version ? b : a));
}

const TTL_MS = 60_000;

/** The ONE reader for market-varying values. Step 1: nothing calls it yet; step 2 moves the constants behind it. */
@Injectable()
export class MarketsService implements OnModuleInit {
  private readonly log = new Logger(MarketsService.name);
  private cache = new Map<string, { at: number; value: ResolvedMarketConfig }>();

  constructor(
    @InjectModel(Market.name) private readonly markets: Model<MarketDocument>,
    @InjectModel(Operator.name) private readonly operators: Model<OperatorDocument>,
    @InjectModel(MarketConfigRow.name) private readonly configs: Model<MarketConfigRowDocument>,
  ) {}

  /** Idempotent: inserts the SA operator, market and config v1 only when missing. Never overwrites. */
  async onModuleInit(): Promise<void> {
    try { await this.seedSaudi(); } catch (err) { this.log.warn(`SA market seed skipped: ${(err as Error).message}`); }
  }

  async seedSaudi(): Promise<void> {
    await this.operators.updateOne({ id: SA_OPERATOR.id }, { $setOnInsert: SA_OPERATOR }, { upsert: true });
    await this.markets.updateOne({ id: SA_MARKET.id }, { $setOnInsert: SA_MARKET }, { upsert: true });
    await this.configs.updateOne(
      { market_id: SA_MARKET_ID, version: 1 },
      { $setOnInsert: { market_id: SA_MARKET_ID, version: 1, effective_from: new Date(0), status: 'active', config: SA_CONFIG_V1, created_by: 'seed' } },
      { upsert: true },
    );
  }

  private marketCache = new Map<string, { at: number; value: MarketInfo | null }>();

  /** Hot path (the middleware calls it per request): positive and not-found answers are both cached for 60 s, so N requests = 1 read. */
  async getMarket(id: string): Promise<MarketInfo> {
    const hit = this.marketCache.get(id);
    if (hit && Date.now() - hit.at < TTL_MS) {
      if (hit.value) return hit.value;
      throw new NotFoundException('market_not_found');
    }
    const m = await this.markets.findOne({ id }).lean<MarketInfo | null>();
    let value: MarketInfo | null;
    if (m) value = { id: m.id, country: m.country, operator_id: m.operator_id, status: m.status };
    else if (id === SA_MARKET_ID) value = SA_MARKET; // DB not seeded yet (fresh test DB): SA is always known
    else value = null;
    this.marketCache.set(id, { at: Date.now(), value });
    if (!value) throw new NotFoundException('market_not_found');
    return value;
  }

  /** `at` omitted = "now" (cached for 60 s). An explicit `at` (past or future) always reads the database and never touches the cache. */
  async getConfig(marketId: string = SA_MARKET_ID, at?: Date): Promise<ResolvedMarketConfig> {
    const hit = at ? undefined : this.cache.get(marketId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
    const rows = await this.configs.find({ market_id: marketId, status: 'active' }).lean<ConfigVersion[]>();
    const picked = pickActiveVersion(rows, at ?? new Date());
    let value: ResolvedMarketConfig;
    if (picked) value = { market_id: marketId, version: picked.version, config: picked.config };
    else if (marketId === SA_MARKET_ID) value = { market_id: SA_MARKET_ID, version: 1, config: SA_CONFIG_V1 };
    else throw new NotFoundException('market_config_not_found');
    if (!at) this.cache.set(marketId, { at: Date.now(), value });
    return value;
  }

  /** Publishes the next version after validation. Rows are never edited. */
  async publishConfig(marketId: string, config: MarketConfig, effectiveFrom: Date, by: string): Promise<number> {
    const problems = validateMarketConfig(config);
    if (problems.length) throw new BadRequestException({ code: 'market_config_invalid', problems });
    await this.getMarket(marketId);
    const last = await this.configs.findOne({ market_id: marketId }).sort({ version: -1 }).lean<{ version: number } | null>();
    const version = (last?.version ?? 0) + 1;
    await this.configs.create({ market_id: marketId, version, effective_from: effectiveFrom, status: 'active', config, created_by: by });
    this.cache.delete(marketId);
    return version;
  }
}
