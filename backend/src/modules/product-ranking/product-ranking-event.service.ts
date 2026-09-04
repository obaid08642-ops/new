import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { ProductRankingService } from './product-ranking.service';
import {
  ProductRankingMetrics,
  ProductRankingMetricsDocument,
} from '../../schemas/product-ranking-metrics.schema';

export type RankingEventType =
  | 'product_viewed'
  | 'product_searched'
  | 'product_clicked'
  | 'product_added_to_cart'
  | 'purchase_completed'
  | 'wishlist_added';

export interface RecordRankingEventDto {
  eventType: RankingEventType;
  drugId: string;
  pharmacyId?: string;
  category?: string;
  quantity?: number;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ProductRankingEventService {
  private readonly logger = new Logger('ProductRankingEventService');

  constructor(
    @InjectModel(ProductRankingMetrics.name)
    private readonly metricsModel: Model<ProductRankingMetricsDocument>,
    private readonly rankingService: ProductRankingService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Validates and deduplicates behavioral events to prevent gaming/spam.
   * Views and search clicks have a sliding suppression window per user/IP.
   * Purchases and cart adds are always counted.
   */
  private async shouldCountEvent(dto: RecordRankingEventDto): Promise<boolean> {
    const { eventType, drugId, userId, sessionId, ipAddress } = dto;

    // Direct transaction events are always counted
    if (eventType === 'purchase_completed' || eventType === 'product_added_to_cart' || eventType === 'wishlist_added') {
      return true;
    }

    // Engagement events: deduplicate per user/session/ip within window
    const identifier = userId || sessionId || ipAddress || 'anonymous';
    const dedupeKey = `event:dedupe:${eventType}:${drugId}:${identifier}`;

    // 10 minutes window for views, 5 minutes for search clicks
    const ttlSeconds = eventType === 'product_viewed' ? 600 : 300;
    const exists = await this.redisService.exists(dedupeKey);
    if (exists) {
      return false; // suppressed to prevent manipulation
    }

    await this.redisService.set(dedupeKey, '1', ttlSeconds);
    return true;
  }

  /**
   * Main entrypoint for processing any ranking signal.
   * Updates MongoDB metrics, recalculates dynamic scores, and updates Redis ZSets.
   */
  async recordEvent(dto: RecordRankingEventDto): Promise<{ success: boolean; counted: boolean; newScore?: number }> {
    const { eventType, drugId, pharmacyId = 'global', category = 'general', quantity = 1 } = dto;

    const counted = await this.shouldCountEvent(dto);
    if (!counted) {
      return { success: true, counted: false };
    }

    const incField: Record<string, number> = {};
    switch (eventType) {
      case 'product_viewed':
        incField.views_count = 1;
        break;
      case 'product_searched':
        incField.searches_count = 1;
        break;
      case 'product_clicked':
        incField.clicks_count = 1;
        break;
      case 'product_added_to_cart':
        incField.cart_adds_count = Math.max(1, quantity);
        break;
      case 'purchase_completed':
        incField.purchases_count = Math.max(1, quantity);
        break;
      case 'wishlist_added':
        incField.wishlist_adds_count = 1;
        break;
    }

    // Atomic increment in MongoDB
    await this.metricsModel.findOneAndUpdate(
      { drug_id: drugId, pharmacy_id: pharmacyId },
      {
        $inc: incField,
        $setOnInsert: {
          category: category.trim().toLowerCase(),
          first_published_at: new Date(),
        },
        $set: {
          last_event_at: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    // Continuous dynamic score recalculation and Redis ZSet updates
    const { compositeScore } = await this.rankingService.updateScores(drugId, pharmacyId, category);

    // Invalidate cached medicine catalog pages
    await this.invalidateCatalogCache(pharmacyId, category);

    return {
      success: true,
      counted: true,
      newScore: compositeScore,
    };
  }

  /**
   * Invalidates catalog caches across Redis to reflect near-real-time ordering.
   */
  private async invalidateCatalogCache(pharmacyId: string, category: string): Promise<void> {
    try {
      const keys = await this.redisService.keys('med:page:*');
      for (const k of keys) {
        await this.redisService.del(k);
      }
      await this.redisService.del('med:hot');
      await this.redisService.del(`med:pharm:${pharmacyId}:catalog`);
    } catch (err) {
      this.logger.warn(`Failed to invalidate catalog cache: ${(err as Error).message}`);
    }
  }
}
