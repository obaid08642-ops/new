import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import {
  DAILY_COLLECTION, RANK_COLLECTION, SERVICE_ID, SIGNAL_FIELD, dayKey, isBotUserAgent,
  type RankedVertical, type RankingSignal,
} from './catalogue-ranking';
import { recomputeCatalogueRanking, type Db } from './catalogue-ranking.recompute';

export interface SignalContext { ip?: string; userAgent?: string; sessionId?: string }
export interface SignalResult { counted: boolean; reason?: 'bot' | 'duplicate' | 'unknown_service' | 'invalid' }

/** Window in which one visitor counts once per service and signal. */
const DEDUPE_SECONDS = { view: 600, search: 300 } as const;

@Injectable()
export class CatalogueRankingService {
  private readonly logger = new Logger('CatalogueRankingService');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private async bump(vertical: RankedVertical, serviceId: string, signal: RankingSignal): Promise<void> {
    await this.conn.collection(DAILY_COLLECTION).updateOne(
      { vertical, service_id: serviceId, day: dayKey(new Date()) },
      { $inc: { [SIGNAL_FIELD[signal]]: 1 }, $setOnInsert: { vertical, service_id: serviceId, day: dayKey(new Date()) } },
      { upsert: true },
    );
  }

  /** A signal from a browser or an app (view, search result opened). Bots, repeats and ids that are not in the catalogue are not counted. */
  async recordClientSignal(vertical: RankedVertical, serviceId: string, signal: 'view' | 'search', ctx: SignalContext): Promise<SignalResult> {
    if (!SERVICE_ID.test(serviceId)) return { counted: false, reason: 'invalid' };
    if (isBotUserAgent(ctx.userAgent)) return { counted: false, reason: 'bot' };
    const known = await this.conn.collection(RANK_COLLECTION[vertical]).findOne({ id: { $eq: serviceId }, is_deleted: { $ne: true } }, { projection: { _id: 1 } });
    if (!known) return { counted: false, reason: 'unknown_service' };
    if (this.redis) {
      // a salted hash of the visitor, kept in Redis for minutes only: nothing that identifies a person is stored
      const visitor = createHash('sha256').update(`${process.env.JWT_SECRET ?? 'catalogue-ranking'}|${ctx.sessionId ?? ''}|${ctx.ip ?? ''}|${ctx.userAgent ?? ''}`).digest('hex').slice(0, 24);
      const key = `crk:${vertical}:${serviceId}:${signal}:${visitor}`;
      if (await this.redis.exists(key)) return { counted: false, reason: 'duplicate' };
      await this.redis.set(key, '1', DEDUPE_SECONDS[signal]);
    }
    await this.bump(vertical, serviceId, signal);
    return { counted: true };
  }

  /** Counted by the server when a service is added to the cart: never fails the cart. */
  async recordCartAdd(vertical: RankedVertical, serviceId: string): Promise<void> {
    try {
      if (SERVICE_ID.test(String(serviceId))) await this.bump(vertical, serviceId, 'cart_add');
    } catch (e) {
      this.logger.warn(`cart add not counted: ${(e as Error).message}`);
    }
  }

  recompute(write = true) {
    return recomputeCatalogueRanking(this.conn.db as unknown as Db, write);
  }
}
