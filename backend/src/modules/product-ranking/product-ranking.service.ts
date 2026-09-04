import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import {
  ProductRankingMetrics,
  ProductRankingMetricsDocument,
} from '../../schemas/product-ranking-metrics.schema';

export interface RankingScope {
  pharmacyId?: string; // undefined or 'global' for global storefront
  category?: string;   // undefined for ALL CATEGORIES
  sort?: 'smart_ranking' | 'trending' | 'bestseller' | 'most_viewed';
  limit?: number;
  offset?: number;
}

export interface CandidateRelevance {
  drugId: string;
  textScore: number;
}

@Injectable()
export class ProductRankingService {
  private readonly logger = new Logger('ProductRankingService');

  // Multi-dimensional signal weights
  private readonly WEIGHT_PURCHASE = 5.0;
  private readonly WEIGHT_CART_ADD = 3.0;
  private readonly WEIGHT_WISHLIST = 2.0;
  private readonly WEIGHT_SEARCH = 1.5;
  private readonly WEIGHT_VIEW = 1.0;
  private readonly CONVERSION_SCALE = 10.0;

  // Recency half-life parameters in days
  private readonly POPULARITY_HALF_LIFE_DAYS = 30;
  private readonly TRENDING_HALF_LIFE_DAYS = 7;
  private readonly COLD_START_BOOST_DAYS = 7;
  private readonly COLD_START_INITIAL_SCORE = 15.0;

  constructor(
    @InjectModel(ProductRankingMetrics.name)
    private readonly metricsModel: Model<ProductRankingMetricsDocument>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Redis ZSet key generator for continuous dynamic re-ranking.
   * Scopes strictly partition datasets:
   * - Global all categories: rank:global:all
   * - Global category specific: rank:global:cat:{cat}
   * - Pharmacy all categories: rank:pharmacy:{pId}:all
   * - Pharmacy category specific: rank:pharmacy:{pId}:cat:{cat}
   */
  getZSetKey(scope: { pharmacyId?: string; category?: string; trending?: boolean }): string {
    const prefix = scope.trending ? 'rank:trending' : 'rank:popular';
    const target = scope.pharmacyId && scope.pharmacyId !== 'global'
      ? `pharmacy:${scope.pharmacyId}`
      : 'global';
    
    if (scope.category && scope.category.trim() !== '' && scope.category.toLowerCase() !== 'all') {
      const normalizedCat = scope.category.trim().toLowerCase().replace(/\s+/g, '_');
      return `${prefix}:${target}:cat:${normalizedCat}`;
    }
    return `${prefix}:${target}:all`;
  }

  /**
   * Calculates availability multiplier:
   * In stock = 1.0, low stock = 0.2, out of stock/discontinued = 0.0.
   */
  getAvailabilityMultiplier(status?: string): number {
    switch (status) {
      case 'in_stock':
        return 1.0;
      case 'low_stock':
        return 0.2;
      case 'out_of_stock':
      case 'discontinued':
        return 0.0;
      default:
        return 1.0;
    }
  }

  /**
   * Exponential recency decay multiplier: e^(-lambda * delta_t_days)
   */
  getRecencyDecayMultiplier(lastEventDate: Date, halfLifeDays: number): number {
    const deltaDays = Math.max(0, (Date.now() - new Date(lastEventDate).getTime()) / (1000 * 3600 * 24));
    const lambda = Math.LN2 / halfLifeDays;
    return Math.exp(-lambda * deltaDays);
  }

  /**
   * Cold start boost: Allows new products published within 7 days
   * to gain initial organic exposure without fake activity.
   */
  getColdStartBonus(firstPublishedDate: Date): number {
    const ageDays = Math.max(0, (Date.now() - new Date(firstPublishedDate).getTime()) / (1000 * 3600 * 24));
    if (ageDays >= this.COLD_START_BOOST_DAYS) return 0;
    const progress = 1 - (ageDays / this.COLD_START_BOOST_DAYS);
    return Math.round(this.COLD_START_INITIAL_SCORE * progress * 100) / 100;
  }

  /**
   * Continuous multi-dimensional composite scoring formula.
   */
  calculateCompositeScore(
    metrics: Partial<ProductRankingMetrics>,
    options?: { isTrending?: boolean },
  ): { compositeScore: number; trendingScore: number } {
    const views = metrics.views_count || 0;
    const searches = metrics.searches_count || 0;
    const clicks = metrics.clicks_count || 0;
    const cartAdds = metrics.cart_adds_count || 0;
    const purchases = metrics.purchases_count || 0;
    const wishlists = metrics.wishlist_adds_count || 0;
    const availability = this.getAvailabilityMultiplier(metrics.availability_status);
    const lastEvent = metrics.last_event_at || new Date();
    const publishedAt = metrics.first_published_at || new Date();

    const conversionRate = views > 0 ? (purchases / views) : 0;
    const conversionBoost = conversionRate * this.CONVERSION_SCALE;

    const rawSignalScore =
      (purchases * this.WEIGHT_PURCHASE) +
      (cartAdds * this.WEIGHT_CART_ADD) +
      (wishlists * this.WEIGHT_WISHLIST) +
      ((searches + clicks) * this.WEIGHT_SEARCH) +
      (views * this.WEIGHT_VIEW) +
      conversionBoost;

    const coldStart = this.getColdStartBonus(publishedAt);

    // Popularity decay (30 days half-life)
    const popDecay = this.getRecencyDecayMultiplier(lastEvent, this.POPULARITY_HALF_LIFE_DAYS);
    const compositeScore = Math.round(((rawSignalScore * popDecay) + coldStart) * availability * 100) / 100;

    // Trending decay (7 days half-life with higher velocity emphasis)
    const trendDecay = this.getRecencyDecayMultiplier(lastEvent, this.TRENDING_HALF_LIFE_DAYS);
    const trendingScore = Math.round(((rawSignalScore * trendDecay) + (coldStart * 1.5)) * availability * 100) / 100;

    return { compositeScore, trendingScore };
  }

  /**
   * Synchronously updates Redis Sorted Sets and MongoDB metrics.
   * Continuous O(log N) re-ranking.
   */
  async updateScores(
    drugId: string,
    pharmacyId: string = 'global',
    category: string = 'general',
    availabilityStatus?: string,
  ): Promise<{ compositeScore: number; trendingScore: number }> {
    const cleanPharm = pharmacyId || 'global';
    const cleanCat = (category || 'general').trim().toLowerCase();

    // 1. Fetch or create metrics record
    let record = await this.metricsModel.findOne({ drug_id: drugId, pharmacy_id: cleanPharm });
    if (!record) {
      record = new this.metricsModel({
        drug_id: drugId,
        pharmacy_id: cleanPharm,
        category: cleanCat,
        availability_status: availabilityStatus || 'in_stock',
        first_published_at: new Date(),
        last_event_at: new Date(),
      });
    } else if (availabilityStatus) {
      record.availability_status = availabilityStatus;
    }

    // 2. Compute live continuous scores
    const { compositeScore, trendingScore } = this.calculateCompositeScore(record);
    record.composite_score = compositeScore;
    record.trending_score = trendingScore;
    record.conversion_rate = record.views_count > 0 ? (record.purchases_count / record.views_count) : 0;
    await record.save();

    // 3. Update Redis Sorted Sets continuously across all relevant scopes
    // Scope A: Specific target (global or pharmacy) - ALL CATEGORIES
    const keyAllPopular = this.getZSetKey({ pharmacyId: cleanPharm });
    const keyAllTrending = this.getZSetKey({ pharmacyId: cleanPharm, trending: true });
    await this.redisService.zadd(keyAllPopular, compositeScore, drugId);
    await this.redisService.zadd(keyAllTrending, trendingScore, drugId);

    // Scope B: Specific target (global or pharmacy) - CATEGORY SPECIFIC
    if (cleanCat && cleanCat !== 'all') {
      const keyCatPopular = this.getZSetKey({ pharmacyId: cleanPharm, category: cleanCat });
      const keyCatTrending = this.getZSetKey({ pharmacyId: cleanPharm, category: cleanCat, trending: true });
      await this.redisService.zadd(keyCatPopular, compositeScore, drugId);
      await this.redisService.zadd(keyCatTrending, trendingScore, drugId);
    }

    // If pharmacy-specific, also sync to Global scope
    if (cleanPharm !== 'global') {
      await this.syncGlobalAggregation(drugId, cleanCat);
    }

    return { compositeScore, trendingScore };
  }

  /**
   * Aggregates across pharmacies to update Global ZSets
   */
  private async syncGlobalAggregation(drugId: string, category: string): Promise<void> {
    const allPharmacyRecords = await this.metricsModel.find({ drug_id: drugId });
    if (!allPharmacyRecords.length) return;

    let totalViews = 0;
    let totalSearches = 0;
    let totalClicks = 0;
    let totalCarts = 0;
    let totalPurchases = 0;
    let totalWishlists = 0;
    let latestEvent = new Date(0);
    let earliestPublished = new Date();
    let bestAvailability = 'out_of_stock';

    for (const r of allPharmacyRecords) {
      if (r.pharmacy_id === 'global') continue;
      totalViews += r.views_count;
      totalSearches += r.searches_count;
      totalClicks += r.clicks_count;
      totalCarts += r.cart_adds_count;
      totalPurchases += r.purchases_count;
      totalWishlists += r.wishlist_adds_count;
      if (r.last_event_at && r.last_event_at > latestEvent) latestEvent = r.last_event_at;
      if (r.first_published_at && r.first_published_at < earliestPublished) earliestPublished = r.first_published_at;
      if (r.availability_status === 'in_stock') bestAvailability = 'in_stock';
      else if (r.availability_status === 'low_stock' && bestAvailability !== 'in_stock') bestAvailability = 'low_stock';
    }

    let globalRecord = await this.metricsModel.findOne({ drug_id: drugId, pharmacy_id: 'global' });
    if (!globalRecord) {
      globalRecord = new this.metricsModel({
        drug_id: drugId,
        pharmacy_id: 'global',
        category,
        first_published_at: earliestPublished,
      });
    }

    globalRecord.views_count = totalViews;
    globalRecord.searches_count = totalSearches;
    globalRecord.clicks_count = totalClicks;
    globalRecord.cart_adds_count = totalCarts;
    globalRecord.purchases_count = totalPurchases;
    globalRecord.wishlist_adds_count = totalWishlists;
    globalRecord.last_event_at = latestEvent;
    globalRecord.availability_status = bestAvailability;

    const { compositeScore, trendingScore } = this.calculateCompositeScore(globalRecord);
    globalRecord.composite_score = compositeScore;
    globalRecord.trending_score = trendingScore;
    await globalRecord.save();

    // Update global ZSets
    const gKeyAllPopular = this.getZSetKey({ pharmacyId: 'global' });
    const gKeyAllTrending = this.getZSetKey({ pharmacyId: 'global', trending: true });
    await this.redisService.zadd(gKeyAllPopular, compositeScore, drugId);
    await this.redisService.zadd(gKeyAllTrending, trendingScore, drugId);

    if (category && category !== 'all') {
      const gKeyCatPopular = this.getZSetKey({ pharmacyId: 'global', category });
      const gKeyCatTrending = this.getZSetKey({ pharmacyId: 'global', category, trending: true });
      await this.redisService.zadd(gKeyCatPopular, compositeScore, drugId);
      await this.redisService.zadd(gKeyCatTrending, trendingScore, drugId);
    }
  }

  /**
   * Retrieves continuously ranked drug IDs for a given scope and pagination.
   * If scope.category is omitted -> ranks ALL CATEGORIES together.
   * If scope.category is specified -> ranks ONLY within that category.
   */
  async getRankedDrugIds(scope: RankingScope): Promise<{ drugIds: string[]; total: number }> {
    const isTrending = scope.sort === 'trending';
    const key = this.getZSetKey({
      pharmacyId: scope.pharmacyId,
      category: scope.category,
      trending: isTrending,
    });

    const total = await this.redisService.zcard(key);
    const offset = scope.offset || 0;
    const limit = scope.limit || 20;
    const stop = offset + limit - 1;

    // If Redis ZSet is populated, fetch directly in O(log N + M)
    if (total > 0) {
      const ids = await this.redisService.zrevrange(key, offset, stop);
      return { drugIds: ids, total };
    }

    // Fallback: Query MongoDB metrics and hydrate ZSet
    const query: any = {};
    if (scope.pharmacyId && scope.pharmacyId !== 'global') {
      query.pharmacy_id = scope.pharmacyId;
    } else {
      query.pharmacy_id = 'global';
    }

    if (scope.category && scope.category.trim() !== '' && scope.category.toLowerCase() !== 'all') {
      query.category = scope.category.trim().toLowerCase();
    }

    const sortField: any = isTrending ? { trending_score: -1 } : { composite_score: -1 };
    const docs = await this.metricsModel.find(query).sort(sortField).skip(offset).limit(limit).exec();
    const count = await this.metricsModel.countDocuments(query).exec();

    // Hydrate Redis ZSet asynchronously
    for (const d of docs) {
      const score = isTrending ? d.trending_score : d.composite_score;
      await this.redisService.zadd(key, score, d.drug_id);
    }

    return {
      drugIds: docs.map((d: any) => d.drug_id),
      total: count,
    };
  }

  /**
   * Blends text search relevance with continuous dynamic popularity.
   * FinalScore = 0.7 * TextRelevance + 0.3 * NormalizedPopularityScore
   */
  async blendSearchRelevance(
    candidates: CandidateRelevance[],
    scope: { pharmacyId?: string; category?: string },
  ): Promise<string[]> {
    if (!candidates.length) return [];

    const key = this.getZSetKey({ pharmacyId: scope.pharmacyId, category: scope.category });
    const maxTextScore = Math.max(...candidates.map((c) => c.textScore), 1.0);

    const scored = await Promise.all(
      candidates.map(async (c) => {
        const popScore = (await this.redisService.zscore(key, c.drugId)) || 0;
        const normText = c.textScore / maxTextScore;
        const normPop = Math.min(1.0, popScore / 100.0);
        const finalScore = (normText * 0.7) + (normPop * 0.3);
        return { drugId: c.drugId, finalScore };
      }),
    );

    scored.sort((a, b) => b.finalScore - a.finalScore);
    return scored.map((s) => s.drugId);
  }

  /**
   * Diagnostic telemetry for product rank position and scores across scopes.
   */
  async getTelemetry(drugId: string, pharmacyId: string = 'global') {
    const record = await this.metricsModel.findOne({ drug_id: drugId, pharmacy_id: pharmacyId });
    const globalKey = this.getZSetKey({ pharmacyId });
    const rank = await this.redisService.zrevrank(globalKey, drugId);
    const score = await this.redisService.zscore(globalKey, drugId);

    return {
      drug_id: drugId,
      pharmacy_id: pharmacyId,
      metrics: record || null,
      current_rank: rank !== null ? rank + 1 : null,
      current_score: score !== null ? score : 0,
      timestamp: new Date().toISOString(),
    };
  }
}
