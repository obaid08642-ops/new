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
exports.ProductRankingEventService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const redis_service_1 = require("../redis/redis.service");
const product_ranking_service_1 = require("./product-ranking.service");
const product_ranking_metrics_schema_1 = require("../../schemas/product-ranking-metrics.schema");

let ProductRankingEventService = class ProductRankingEventService {
    constructor(metricsModel, rankingService, redisService) {
        this.metricsModel = metricsModel;
        this.rankingService = rankingService;
        this.redisService = redisService;
        this.logger = new common_1.Logger('ProductRankingEventService');
    }

    async shouldCountEvent(dto) {
        const { eventType, drugId, userId, sessionId, ipAddress } = dto;
        if (eventType === 'purchase_completed' || eventType === 'product_added_to_cart' || eventType === 'wishlist_added') {
            return true;
        }
        const identifier = userId || sessionId || ipAddress || 'anonymous';
        const dedupeKey = `event:dedupe:${eventType}:${drugId}:${identifier}`;
        const ttlSeconds = eventType === 'product_viewed' ? 600 : 300;
        const exists = await this.redisService.exists(dedupeKey);
        if (exists) {
            return false;
        }
        await this.redisService.set(dedupeKey, '1', ttlSeconds);
        return true;
    }

    async recordEvent(dto) {
        const { eventType, drugId, pharmacyId = 'global', category = 'general', quantity = 1 } = dto;
        const counted = await this.shouldCountEvent(dto);
        if (!counted) {
            return { success: true, counted: false };
        }

        const incField = {};
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
            { upsert: true, new: true }
        );

        const { compositeScore } = await this.rankingService.updateScores(drugId, pharmacyId, category);
        await this.invalidateCatalogCache(pharmacyId, category);

        return {
            success: true,
            counted: true,
            newScore: compositeScore,
        };
    }

    async invalidateCatalogCache(pharmacyId, category) {
        try {
            const keys = await this.redisService.keys('med:page:*');
            for (const k of keys) {
                await this.redisService.del(k);
            }
            await this.redisService.del('med:hot');
            await this.redisService.del(`med:pharm:${pharmacyId}:catalog`);
        }
        catch (err) {
            this.logger.warn(`Failed to invalidate catalog cache: ${err.message}`);
        }
    }
};

exports.ProductRankingEventService = ProductRankingEventService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_ranking_metrics_schema_1.ProductRankingMetrics.name)),
    __metadata("design:paramtypes", [mongoose_2.Model, product_ranking_service_1.ProductRankingService, redis_service_1.RedisService])
], ProductRankingEventService);
