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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductRankingMetricsSchema = exports.ProductRankingMetrics = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let ProductRankingMetrics = class ProductRankingMetrics {
};
exports.ProductRankingMetrics = ProductRankingMetrics;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), index: true }),
    __metadata("design:type", String)
], ProductRankingMetrics.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProductRankingMetrics.prototype, "drug_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true, default: 'global' }),
    __metadata("design:type", String)
], ProductRankingMetrics.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true, default: 'general' }),
    __metadata("design:type", String)
], ProductRankingMetrics.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProductRankingMetrics.prototype, "views_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProductRankingMetrics.prototype, "searches_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProductRankingMetrics.prototype, "clicks_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProductRankingMetrics.prototype, "cart_adds_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProductRankingMetrics.prototype, "purchases_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProductRankingMetrics.prototype, "wishlist_adds_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProductRankingMetrics.prototype, "conversion_rate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, index: true }),
    __metadata("design:type", Number)
], ProductRankingMetrics.prototype, "composite_score", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, index: true }),
    __metadata("design:type", Number)
], ProductRankingMetrics.prototype, "trending_score", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'in_stock', index: true }),
    __metadata("design:type", String)
], ProductRankingMetrics.prototype, "availability_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ProductRankingMetrics.prototype, "last_event_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ProductRankingMetrics.prototype, "first_published_at", void 0);
exports.ProductRankingMetrics = ProductRankingMetrics = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'product_ranking_metrics' })
], ProductRankingMetrics);
exports.ProductRankingMetricsSchema = mongoose_1.SchemaFactory.createForClass(ProductRankingMetrics);
exports.ProductRankingMetricsSchema.index({ drug_id: 1, pharmacy_id: 1 }, { unique: true });
exports.ProductRankingMetricsSchema.index({ pharmacy_id: 1, composite_score: -1 });
exports.ProductRankingMetricsSchema.index({ pharmacy_id: 1, category: 1, composite_score: -1 });
exports.ProductRankingMetricsSchema.index({ pharmacy_id: 1, trending_score: -1 });
