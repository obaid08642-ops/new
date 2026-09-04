"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductRankingService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const redis_service_1 = require("../redis/redis.service");
const product_ranking_metrics_schema_1 = require("../../schemas/product-ranking-metrics.schema");

let ProductRankingService = class ProductRankingService {
    constructor(metricsModel, redisService) {
        this.metricsModel = metricsModel;
        this.redisService = redisService;
        this.logger = new common_1.Logger('ProductRankingService');
        this.WEIGHT_PURCHASE = 5.0;
        this.WEIGHT_CART_ADD = 3.0;
        this.WEIGHT_WISHLIST = 2.0;
        this.WEIGHT_SEARCH = 1.5;
        this.WEIGHT_VIEW = 1.0;
        this.CONVERSION_SCALE = 10.0;
        this.POPULARITY_HALF_LIFE_DAYS = 30;
        this.TRENDING_HALF_LIFE_DAYS = 7;
        this.COLD_START_BOOST_DAYS = 7;
        this.COLD_START_INITIAL_SCORE = 15.0;
    }

    getZSetKey(scope) {
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

    getAvailabilityMultiplier(status) {
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

    getRecencyDecayMultiplier(lastEventDate, halfLifeDays) {
        const deltaDays = Math.max(0, (Date.now() - new Date(lastEventDate).getTime()) / (1000 * 3600 * 24));
        const lambda = Math.LN2 / halfLifeDays;
        return Math.exp(-lambda * deltaDays);
    }

    getColdStartBonus(firstPublishedDate) {
        const ageDays = Math.max(0, (Date.now() - new Date(firstPublishedDate).getTime()) / (1000 * 3600 * 24));
        if (ageDays >= this.COLD_START_BOOST_DAYS) return 0;
        const progress = 1 - (ageDays / this.COLD_START_BOOST_DAYS);
        return Math.round(this.COLD_START_INITIAL_SCORE * progress * 100) / 100;
    }

    calculateCompositeScore(metrics, options) {
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

        const popDecay = this.getRecencyDecayMultiplier(lastEvent, this.POPULARITY_HALF_LIFE_DAYS);
        const compositeScore = Math.round(((rawSignalScore * popDecay) + coldStart) * availability * 100) / 100;

        const trendDecay = this.getRecencyDecayMultiplier(lastEvent, this.TRENDING_HALF_LIFE_DAYS);
        const trendingScore = Math.round(((rawSignalScore * trendDecay) + (coldStart * 1.5)) * availability * 100) / 100;

        return { compositeScore, trendingScore };
    }

    async updateScores(drugId, pharmacyId = 'global', category = 'general', availabilityStatus) {
        const cleanPharm = pharmacyId || 'global';
        const cleanCat = (category || 'general').trim().toLowerCase();

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

        const { compositeScore, trendingScore } = this.calculateCompositeScore(record);
        record.composite_score = compositeScore;
        record.trending_score = trendingScore;
        record.conversion_rate = record.views_count > 0 ? (record.purchases_count / record.views_count) : 0;
        if (typeof (record === null || record === void 0 ? void 0 : record.save) === 'function') {
            await record.save();
        }

        const keyAllPopular = this.getZSetKey({ pharmacyId: cleanPharm });
        const keyAllTrending = this.getZSetKey({ pharmacyId: cleanPharm, trending: true });
        await this.redisService.zadd(keyAllPopular, compositeScore, drugId);
        await this.redisService.zadd(keyAllTrending, trendingScore, drugId);

        if (cleanCat && cleanCat !== 'all') {
            const keyCatPopular = this.getZSetKey({ pharmacyId: cleanPharm, category: cleanCat });
            const keyCatTrending = this.getZSetKey({ pharmacyId: cleanPharm, category: cleanCat, trending: true });
            await this.redisService.zadd(keyCatPopular, compositeScore, drugId);
            await this.redisService.zadd(keyCatTrending, trendingScore, drugId);
        }

        if (cleanPharm !== 'global') {
            await this.syncGlobalAggregation(drugId, cleanCat);
        }

        return { compositeScore, trendingScore };
    }

    async syncGlobalAggregation(drugId, category) {
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
        if (typeof (globalRecord === null || globalRecord === void 0 ? void 0 : globalRecord.save) === 'function') {
            await globalRecord.save();
        }

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

    async getRankedDrugIds(scope) {
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

        if (total > 0) {
            const ids = await this.redisService.zrevrange(key, offset, stop);
            return { drugIds: ids, total };
        }

        const query = {};
        if (scope.pharmacyId && scope.pharmacyId !== 'global') {
            query.pharmacy_id = scope.pharmacyId;
        } else {
            query.pharmacy_id = 'global';
        }

        if (scope.category && scope.category.trim() !== '' && scope.category.toLowerCase() !== 'all') {
            query.category = scope.category.trim().toLowerCase();
        }

        const sortField = isTrending ? { trending_score: -1 } : { composite_score: -1 };
        const docs = await this.metricsModel.find(query).sort(sortField).skip(offset).limit(limit).exec();
        const count = await this.metricsModel.countDocuments(query).exec();

        for (const d of docs) {
            const score = isTrending ? d.trending_score : d.composite_score;
            await this.redisService.zadd(key, score, d.drug_id);
        }

        return {
            drugIds: docs.map((d) => d.drug_id),
            total: count,
        };
    }

    async blendSearchRelevance(candidates, scope) {
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

    async getTelemetry(drugId, pharmacyId = 'global') {
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
};

exports.ProductRankingService = ProductRankingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_ranking_metrics_schema_1.ProductRankingMetrics.name)),
    __metadata("design:paramtypes", [mongoose_2.Model, redis_service_1.RedisService])
], ProductRankingService);
