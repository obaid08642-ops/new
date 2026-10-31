import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { connectionFlagSource, isKilled } from '../../common/killswitches/killswitches.helper';
import {
  ProductRankingMetrics,
  ProductRankingMetricsDocument,
} from '../../schemas/product-ranking-metrics.schema';

/**
 * P13-R9: every spec mode. `most_viewed`/`bestseller` are legacy aliases kept
 * for existing callers; the four modes below them are the R9 additions.
 */
export type RankingSort =
  | 'smart_ranking' | 'trending' | 'bestseller' | 'most_viewed'
  | 'most_searched' | 'most_added_to_cart' | 'highest_conversion' | 'popular_recently';

export const RANKING_SORTS: readonly RankingSort[] = [
  'smart_ranking', 'trending', 'bestseller', 'most_viewed',
  'most_searched', 'most_added_to_cart', 'highest_conversion', 'popular_recently',
];

/** Unknown sorts fall back to smart_ranking (never throw on user input). */
export function normalizeRankingSort(s?: string): RankingSort {
  return (RANKING_SORTS as readonly string[]).includes(String(s)) ? (s as RankingSort) : 'smart_ranking';
}

/** Mongo field each mode sorts by (shared by the fallback query and hydration). */
export function modeScoreField(sort: RankingSort): string {
  switch (sort) {
    case 'trending': return 'trending_score';
    case 'most_viewed': return 'views_count';
    case 'bestseller': return 'purchases_count';
    case 'most_searched': return 'searches_count';
    case 'most_added_to_cart': return 'cart_adds_count';
    case 'highest_conversion': return 'conversion_rate';
    case 'popular_recently': return 'recent_score';
    case 'smart_ranking':
    default: return 'composite_score';
  }
}

export interface RankingScope {
  pharmacyId?: string; // undefined or 'global' for global storefront
  category?: string;   // undefined for ALL CATEGORIES
  sort?: RankingSort | string;
  limit?: number;
  offset?: number;
}

export interface CandidateRelevance {
  drugId: string;
  textScore: number;
}

/**
 * The order of every list of medicines (web and app, home, categories, results without a text query): the composite
 * score first, then in stock before out of stock, then with an image before without, then the old usage count and the
 * id (stable). Products with no signals have no score and come after the ones with signals.
 */
const POPULAR_SORT_FIELDS = {
  // a prescription-only item is never promoted by popularity (owner decisions 10 and 29): it keeps its natural place
  _rank: { $cond: [{ $eq: ['$requires_prescription', true] }, 0, { $ifNull: ['$rank_score', 0] }] },
  _in_stock: { $cond: [{ $in: [{ $ifNull: ['$availability_status', 'in_stock'] }, ['out_of_stock', 'discontinued']] }, 0, 1] },
  _has_image: { $cond: [{ $gt: [{ $strLenCP: { $toString: { $ifNull: ['$image_1', { $ifNull: ['$image', ''] }] } } }, 0] }, 1, 0] },
};
export const POPULAR_KEY_STAGES: Record<string, unknown>[] = [
  { $addFields: POPULAR_SORT_FIELDS },
  { $sort: { _rank: -1, _in_stock: -1, _has_image: -1, usage_count: -1, _id: 1 } },
];
/**
 * The order of the pharmacy's "All" (no category chosen): products with signals first, by score, exactly as above; then the rest
 * interleaved across the top-level categories. `category_pos` (the product's place inside its category by in stock, image, usage
 * count and id, refreshed by the ranking job: refreshCategoryPositions) is the round-robin: every category's best product comes
 * before any category's second, so page 1 is a mix of every category. A product the job has not numbered yet comes last.
 * With a category chosen the plain POPULAR_KEY_STAGES apply (that category only, score then tie-breaks).
 */
export const POPULAR_MIX_KEY_STAGES: Record<string, unknown>[] = [
  { $addFields: { ...POPULAR_SORT_FIELDS, _pos: { $ifNull: ['$category_pos', 1_000_000_000] } } },
  { $sort: { _rank: -1, _pos: 1, _in_stock: -1, _has_image: -1, usage_count: -1, _id: 1 } },
];
export const popularKeyStages = (mix: boolean): Record<string, unknown>[] => (mix ? POPULAR_MIX_KEY_STAGES : POPULAR_KEY_STAGES);
export const popularOrderStages = (mix: boolean): Record<string, unknown>[] => [...popularKeyStages(mix), { $project: { _rank: 0, _in_stock: 0, _has_image: 0, _pos: 0 } }];
export const POPULAR_ORDER_STAGES: Record<string, unknown>[] = [
  ...POPULAR_KEY_STAGES,
  { $project: { _rank: 0, _in_stock: 0, _has_image: 0 } },
];

/** The only fields POPULAR_KEY_STAGES reads. */
export const POPULAR_SORT_PROJECTION = { rank_score: 1, requires_prescription: 1, availability_status: 1, image_1: 1, image: 1, usage_count: 1 } as const;

/** The same plus the round-robin position, for the "All" list. */
export const POPULAR_MIX_SORT_PROJECTION = { ...POPULAR_SORT_PROJECTION, category_pos: 1 } as const;

type PageCollection = {
  aggregate(pipeline: Record<string, unknown>[]): { toArray(): Promise<any[]> };
  find(filter: Record<string, unknown>, options?: Record<string, unknown>): { toArray(): Promise<any[]> };
};

/**
 * One page of the popular order, read the cheap way. The aggregate above carried EVERY matching document (translations in six
 * languages, ~20 KB each) through its $addFields and $sort, then threw all but 24 away: on ~19k public products that is a
 * scan plus an in-memory sort of hundreds of MB (the `/public` p95 alerts of 2026-10-25..27). Here the sort sees only the six
 * fields it reads (a few hundred bytes a document, a top-k sort of skip+limit), and the full documents are fetched by `_id` for
 * the page alone. Same order as POPULAR_ORDER_STAGES (same stages), same rows, same projection.
 */
export async function popularPage(col: PageCollection, filter: Record<string, unknown>, skip: number, limit: number, projection: Record<string, unknown>, mix = false): Promise<any[]> {
  const picked = await col.aggregate([{ $match: filter }, { $project: mix ? POPULAR_MIX_SORT_PROJECTION : POPULAR_SORT_PROJECTION }, ...popularKeyStages(mix), { $skip: skip }, { $limit: limit }, { $project: { _id: 1 } }]).toArray();
  if (!picked.length) return [];
  const order = picked.map((d) => d._id);
  const docs = await col.find({ _id: { $in: order } }, { projection: { ...projection, _id: 1 } }).toArray();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const dropId = (projection as { _id?: unknown })._id === 0;
  return order.map((id) => byId.get(String(id))).filter((d): d is Record<string, unknown> => !!d).map((d) => {
    if (!dropId) return d;
    const { _id, ...rest } = d;
    return rest;
  });
}

/**
 * Numbers every product inside its top-level category (1 = the category's best by in stock, image, usage count, id) so the "All"
 * list can round-robin across categories with a plain sort. Run by the ranking job; one aggregate, no document loaded by the app.
 */
export async function refreshCategoryPositions(col: { aggregate(p: Record<string, unknown>[]): { toArray(): Promise<unknown[]> } }): Promise<void> {
  await col.aggregate([
    { $match: { category: { $type: 'string' } } },
    { $project: { category: 1, ...POPULAR_SORT_PROJECTION } },
    { $addFields: { _in_stock: POPULAR_SORT_FIELDS._in_stock, _has_image: POPULAR_SORT_FIELDS._has_image, category: '$category' } },
    { $sort: { _in_stock: -1, _has_image: -1, usage_count: -1, _id: 1 } },
    { $group: { _id: '$category', ids: { $push: '$_id' } } },
    { $unwind: { path: '$ids', includeArrayIndex: 'i' } },
    { $project: { _id: '$ids', category_pos: { $add: ['$i', 1] } } },
    { $merge: { into: 'medicines', on: '_id', whenMatched: 'merge', whenNotMatched: 'discard' } },
  ]).toArray();
}

@Injectable()
export class ProductRankingService {
  private readonly logger = new Logger('ProductRankingService');

  // Multi-dimensional signal weights — overridable via env (RANK_W_*), defaults = legacy values.
  // Admin merchandising stays separate: manual boosts live in a different layer, never here.
  private readonly WEIGHT_PURCHASE = Number(process.env.RANK_W_PURCHASE || 5.0);
  private readonly WEIGHT_CART_ADD = Number(process.env.RANK_W_CART_ADD || 3.0);
  private readonly WEIGHT_WISHLIST = Number(process.env.RANK_W_WISHLIST || 2.0);
  private readonly WEIGHT_SEARCH = Number(process.env.RANK_W_SEARCH || 1.5);
  private readonly WEIGHT_VIEW = Number(process.env.RANK_W_VIEW || 1.0);
  private readonly CONVERSION_SCALE = Number(process.env.RANK_CONVERSION_SCALE || 10.0);

  // Recency half-life parameters in days (env-overridable, same defaults)
  private readonly POPULARITY_HALF_LIFE_DAYS = Number(process.env.RANK_POPULARITY_HALF_LIFE_DAYS || 30);
  private readonly TRENDING_HALF_LIFE_DAYS = Number(process.env.RANK_TRENDING_HALF_LIFE_DAYS || 7);
  // P13-R9: "popular recently" velocity window (fixed-window counters are
  // follow-up; this continuous 24h-decay score answers the mode today).
  private readonly RECENT_HALF_LIFE_DAYS = Number(process.env.RANK_RECENT_HALF_LIFE_DAYS || 1);
  private static readonly COLD_START_SOURCES = new Set(['admin', 'pharmacy', 'provider']);
  private readonly COLD_START_BOOST_DAYS = Number(process.env.RANK_COLD_START_BOOST_DAYS || 7);
  private readonly COLD_START_INITIAL_SCORE = Number(process.env.RANK_COLD_START_INITIAL_SCORE || 15.0);

  constructor(
    @InjectModel(ProductRankingMetrics.name)
    private readonly metricsModel: Model<ProductRankingMetricsDocument>,
    private readonly redisService: RedisService,
    // Optional so existing direct constructions (specs) keep working;
    // absent connection fails open (recommendations stay on).
    @Optional() @InjectConnection() private readonly conn?: Connection,
  ) {}

  /**
   * Redis ZSet key generator for continuous dynamic re-ranking.
   * One family per mode (popularity, trending, searched, cart, conversion,
   * recent); scopes strictly partition datasets:
   * - Global all categories: rank:{mode}:global:all
   * - Global category specific: rank:{mode}:global:cat:{cat}
   * - Pharmacy all categories: rank:{mode}:pharmacy:{pId}:all
   * - Pharmacy category specific: rank:{mode}:pharmacy:{pId}:cat:{cat}
   * The `trending` flag is the legacy alias for mode 'trending' (kept so
   * existing keys and callers keep working).
   */
  getZSetKey(scope: { pharmacyId?: string; category?: string; trending?: boolean; mode?: RankingSort | string }): string {
    const sort = normalizeRankingSort(
      scope.mode ?? (scope.trending ? 'trending' : undefined) ?? 'smart_ranking',
    );
    const prefix = sort === 'smart_ranking' ? 'rank:popular'
      : sort === 'trending' ? 'rank:trending'
      : sort === 'bestseller' ? 'rank:sales'
      : sort === 'most_viewed' ? 'rank:views'
      : sort === 'most_searched' ? 'rank:searched'
      : sort === 'most_added_to_cart' ? 'rank:cart'
      : sort === 'highest_conversion' ? 'rank:conversion'
      : 'rank:recent';
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
   * The start of a product's cold-start boost: its creation date when a provider or an admin created it, else 1970 (no
   * boost). The imported catalogue (source master / bulk_import, or an id from the source export) never gets the boost:
   * before this, every product the ranking saw for the first time was "new" and outranked the products with real signals.
   */
  async coldStartPublishedAt(drugId: string): Promise<Date> {
    const never = new Date(0);
    if (!this.conn) return never;
    try {
      const m: any = await this.conn.collection('medicines').findOne(
        { id: { $eq: drugId } },
        { projection: { source: 1, source_product_id: 1, createdAt: 1, created_at: 1 } },
      );
      if (!m || m.source_product_id != null || !ProductRankingService.COLD_START_SOURCES.has(String(m.source))) return never;
      const at = new Date(m.createdAt ?? m.created_at ?? 0);
      return Number.isNaN(at.getTime()) ? never : at;
    } catch {
      return never;
    }
  }

  /** The score copied onto the medicine itself: the lists sort the catalogue by it (see POPULAR_ORDER_STAGES). */
  private async writeRankScore(drugId: string, score: number): Promise<void> {
    if (!this.conn) return;
    try {
      await this.conn.collection('medicines').updateOne({ id: { $eq: drugId } }, { $set: { rank_score: score } });
    } catch (err) {
      this.logger.warn(`rank_score write failed for ${drugId}: ${(err as Error).message}`);
    }
  }

  /**
   * The score job: recomputes every global product's scores from its counters (so the recency decay applies even to
   * products with no new event) and refreshes the ZSets and the medicines' rank_score. Run by the cron and by
   * POST /admin/ranking/recompute.
   */
  async recomputeAll(): Promise<{ updated: number }> {
    let updated = 0;
    const cursor = this.metricsModel.find({ pharmacy_id: 'global' }).cursor();
    for await (const record of cursor as any) {
      record.first_published_at = await this.coldStartPublishedAt(record.drug_id);
      const { compositeScore, trendingScore, recentScore } = this.calculateCompositeScore(record);
      record.composite_score = compositeScore;
      record.trending_score = trendingScore;
      record.recent_score = recentScore;
      await record.save();
      await this.redisService.zadd(this.getZSetKey({ pharmacyId: 'global', mode: 'smart_ranking' }), compositeScore, record.drug_id);
      await this.writeRankScore(record.drug_id, compositeScore);
      updated++;
    }
    // A product a provider or an admin created has no metrics row until its first event, so the job gives it its boost
    // from here (the boost is the only score such a product has); a product that is no longer new and has no signals
    // goes back to 0. The imported catalogue is never selected.
    if (this.conn) {
      const medicines = this.conn.collection('medicines');
      const since = new Date(Date.now() - this.COLD_START_BOOST_DAYS * 86400000);
      const withMetrics = new Set<string>(
        (await this.metricsModel.find({ pharmacy_id: 'global' }).select({ drug_id: 1 }).lean().exec().catch(() => []) as any[]).map((r) => String(r.drug_id)),
      );
      const fresh: any[] = await medicines.find({
        source: { $in: [...ProductRankingService.COLD_START_SOURCES] }, source_product_id: { $exists: false }, createdAt: { $gte: since },
      }, { projection: { id: 1, createdAt: 1, availability_status: 1 } }).toArray();
      const seeded = new Set<string>();
      for (const m of fresh) {
        if (!m?.id || withMetrics.has(String(m.id))) continue;
        const score = Math.round(this.getColdStartBonus(new Date(m.createdAt)) * this.getAvailabilityMultiplier(m.availability_status) * 100) / 100;
        await this.writeRankScore(String(m.id), score);
        seeded.add(String(m.id));
        updated++;
      }
      await refreshCategoryPositions(medicines as any).catch((err) => this.logger.warn(`category_pos refresh failed: ${(err as Error).message}`));
      const stale: any[] = await medicines.find({ rank_score: { $gt: 0 } }, { projection: { id: 1 } }).toArray();
      for (const m of stale) {
        if (m?.id && !withMetrics.has(String(m.id)) && !seeded.has(String(m.id))) await this.writeRankScore(String(m.id), 0);
      }
    }
    return { updated };
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
  ): { compositeScore: number; trendingScore: number; recentScore: number } {
    const views = metrics.views_count || 0;
    const searches = metrics.searches_count || 0;
    const clicks = metrics.clicks_count || 0;
    const cartAdds = metrics.cart_adds_count || 0;
    const purchases = metrics.purchases_count || 0;
    const wishlists = metrics.wishlist_adds_count || 0;
    const availability = this.getAvailabilityMultiplier(metrics.availability_status);
    const lastEvent = metrics.last_event_at || new Date();
    const publishedAt = metrics.first_published_at;

    const conversionRate = views > 0 ? (purchases / views) : 0;
    const conversionBoost = conversionRate * this.CONVERSION_SCALE;

    const rawSignalScore =
      (purchases * this.WEIGHT_PURCHASE) +
      (cartAdds * this.WEIGHT_CART_ADD) +
      (wishlists * this.WEIGHT_WISHLIST) +
      ((searches + clicks) * this.WEIGHT_SEARCH) +
      (views * this.WEIGHT_VIEW) +
      conversionBoost;

    const coldStart = publishedAt ? this.getColdStartBonus(publishedAt) : 0;

    // Popularity decay (30 days half-life)
    const popDecay = this.getRecencyDecayMultiplier(lastEvent, this.POPULARITY_HALF_LIFE_DAYS);
    const compositeScore = Math.round(((rawSignalScore * popDecay) + coldStart) * availability * 100) / 100;

    // Trending decay (7 days half-life with higher velocity emphasis)
    const trendDecay = this.getRecencyDecayMultiplier(lastEvent, this.TRENDING_HALF_LIFE_DAYS);
    const trendingScore = Math.round(((rawSignalScore * trendDecay) + (coldStart * 1.5)) * availability * 100) / 100;

    // P13-R9 "popular recently": 24h-half-life velocity on the same signals.
    const recentDecay = this.getRecencyDecayMultiplier(lastEvent, this.RECENT_HALF_LIFE_DAYS);
    const recentScore = Math.round(((rawSignalScore * recentDecay) + coldStart) * availability * 100) / 100;

    return { compositeScore, trendingScore, recentScore };
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
  ): Promise<{ compositeScore: number; trendingScore: number; recentScore: number }> {
    const cleanPharm = pharmacyId || 'global';
    const cleanCat = (category || 'general').trim().toLowerCase();

    // 1. Fetch or create metrics record
    let record = await this.metricsModel.findOne({ drug_id: { $eq: drugId }, pharmacy_id: { $eq: cleanPharm } });
    if (!record) {
      record = new this.metricsModel({
        drug_id: drugId,
        pharmacy_id: cleanPharm,
        category: cleanCat,
        availability_status: availabilityStatus || 'in_stock',
        last_event_at: new Date(),
      });
    } else if (availabilityStatus) {
      record.availability_status = availabilityStatus;
    }
    record.first_published_at = await this.coldStartPublishedAt(drugId);

    // 2. Compute live continuous scores
    const { compositeScore, trendingScore, recentScore } = this.calculateCompositeScore(record);
    record.composite_score = compositeScore;
    record.trending_score = trendingScore;
    record.recent_score = recentScore;
    record.conversion_rate = record.views_count > 0 ? (record.purchases_count / record.views_count) : 0;
    if (typeof record?.save === 'function') {
      await record.save();
    }
    if (cleanPharm === 'global') await this.writeRankScore(drugId, compositeScore);

    // 3. Update Redis Sorted Sets continuously across all relevant scopes.
    // P13-R9: one ZSet family per ranking mode (popular, trending, sales,
    // views, searched, cart, conversion, recent), each partitioned by scope.
    const modeScores: Record<string, number> = {
      smart_ranking: compositeScore,
      trending: trendingScore,
      bestseller: record.purchases_count || 0,
      most_viewed: record.views_count || 0,
      most_searched: record.searches_count || 0,
      most_added_to_cart: record.cart_adds_count || 0,
      highest_conversion: record.conversion_rate || 0,
      popular_recently: recentScore,
    };
    const writeScope = async (pharmacyId?: string, category?: string) => {
      for (const mode of RANKING_SORTS) {
        await this.redisService.zadd(
          this.getZSetKey({ pharmacyId, category, mode }),
          modeScores[mode],
          drugId,
        );
      }
    };
    // Scope A: Specific target (global or pharmacy) - ALL CATEGORIES
    await writeScope(cleanPharm);
    // Scope B: Specific target (global or pharmacy) - CATEGORY SPECIFIC
    if (cleanCat && cleanCat !== 'all') {
      await writeScope(cleanPharm, cleanCat);
    }

    // If pharmacy-specific, also sync to Global scope
    if (cleanPharm !== 'global') {
      await this.syncGlobalAggregation(drugId, cleanCat);
    }

    return { compositeScore, trendingScore, recentScore };
  }

  /**
   * Aggregates across pharmacies to update Global ZSets
   */
  private async syncGlobalAggregation(drugId: string, category: string): Promise<void> {
     const allPharmacyRecords = await this.metricsModel.find({ drug_id: { $eq: drugId } });
    if (!allPharmacyRecords.length) return;

    let totalViews = 0;
    let totalSearches = 0;
    let totalClicks = 0;
    let totalCarts = 0;
    let totalPurchases = 0;
    let totalWishlists = 0;
    let latestEvent = new Date(0);
    const earliestPublished = await this.coldStartPublishedAt(drugId);
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
      if (r.availability_status === 'in_stock') bestAvailability = 'in_stock';
      else if (r.availability_status === 'low_stock' && bestAvailability !== 'in_stock') bestAvailability = 'low_stock';
    }

     let globalRecord = await this.metricsModel.findOne({ drug_id: { $eq: drugId }, pharmacy_id: 'global' });
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
    globalRecord.first_published_at = earliestPublished;
    globalRecord.last_event_at = latestEvent;
    globalRecord.availability_status = bestAvailability;

    const { compositeScore, trendingScore, recentScore } = this.calculateCompositeScore(globalRecord);
    globalRecord.composite_score = compositeScore;
    globalRecord.trending_score = trendingScore;
    globalRecord.recent_score = recentScore;
    globalRecord.conversion_rate = globalRecord.views_count > 0 ? (globalRecord.purchases_count / globalRecord.views_count) : 0;
    if (typeof globalRecord?.save === 'function') {
      await globalRecord.save();
    }
    await this.writeRankScore(drugId, compositeScore);

    // Update global ZSets — one family per mode, all scopes.
    const globalScores: Record<string, number> = {
      smart_ranking: compositeScore,
      trending: trendingScore,
      bestseller: globalRecord.purchases_count || 0,
      most_viewed: globalRecord.views_count || 0,
      most_searched: globalRecord.searches_count || 0,
      most_added_to_cart: globalRecord.cart_adds_count || 0,
      highest_conversion: globalRecord.conversion_rate || 0,
      popular_recently: recentScore,
    };
    for (const mode of RANKING_SORTS) {
      await this.redisService.zadd(this.getZSetKey({ pharmacyId: 'global', mode }), globalScores[mode], drugId);
    }

    if (category && category !== 'all') {
      for (const mode of RANKING_SORTS) {
        await this.redisService.zadd(this.getZSetKey({ pharmacyId: 'global', category, mode }), globalScores[mode], drugId);
      }
    }
  }

  /**
   * Retrieves continuously ranked drug IDs for a given scope and pagination.
   * If scope.category is omitted -> ranks ALL CATEGORIES together.
   * If scope.category is specified -> ranks ONLY within that category.
   */
  async getRankedDrugIds(scope: RankingScope): Promise<{ drugIds: string[]; total: number }> {
    const sort = normalizeRankingSort(typeof scope.sort === 'string' ? scope.sort : undefined);
    // Kill switch: serve the non-personalized default list (deterministic
    // catalog order, no behavior signals) and never hydrate the Redis ZSets
    // with degraded reads.
    if (await isKilled('recommendations', connectionFlagSource(this.conn))) {
      const { docs, count } = await this.mongoRanked(scope, { drug_id: 1 });
      return { drugIds: docs.map((d: any) => d.drug_id), total: count };
    }
    const key = this.getZSetKey({
      pharmacyId: scope.pharmacyId,
      category: scope.category,
      mode: sort,
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
    const sortField: any = { [modeScoreField(sort)]: -1 };
    const { docs, count } = await this.mongoRanked(scope, sortField, offset, limit);

    // Hydrate Redis ZSet asynchronously
    for (const d of docs) {
      const score = d[modeScoreField(sort)] ?? 0;
      await this.redisService.zadd(key, score, d.drug_id);
    }

    return {
      drugIds: docs.map((d: any) => d.drug_id),
      total: count,
    };
  }

  /** Shared Mongo fallback query (scope filter + sort + page). Never touches Redis. */
  private async mongoRanked(
    scope: RankingScope,
    sort: any,
    offset?: number,
    limit?: number,
  ): Promise<{ docs: any[]; count: number }> {
    // Request values reach this query, so they are coerced to strings and matched with $eq
    // (a crafted object can never become an operator).
    const query: Record<string, { $eq: string }> = {};
    const pharmacyId = typeof scope.pharmacyId === 'string' ? scope.pharmacyId : '';
    query.pharmacy_id = { $eq: pharmacyId && pharmacyId !== 'global' ? pharmacyId : 'global' };

    const category = typeof scope.category === 'string' ? scope.category.trim().toLowerCase() : '';
    if (category && category !== 'all') {
      query.category = { $eq: category };
    }

    const docs = await this.metricsModel.find(query).sort(sort).skip(offset ?? 0).limit(limit ?? 20).exec();
    const count = await this.metricsModel.countDocuments(query).exec();
    return { docs, count };
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
    const record = await this.metricsModel.findOne({ drug_id: { $eq: drugId }, pharmacy_id: { $eq: pharmacyId } });
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
