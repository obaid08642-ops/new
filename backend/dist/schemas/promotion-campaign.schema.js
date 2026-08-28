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
exports.PromotionCampaignSchema = exports.PromotionCampaign = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
let PromotionCampaign = class PromotionCampaign extends mongoose_2.Document {
};
exports.PromotionCampaign = PromotionCampaign;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], PromotionCampaign.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PromotionCampaign.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PromotionCampaign.prototype, "title_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PromotionCampaign.prototype, "title_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], PromotionCampaign.prototype, "original_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], PromotionCampaign.prototype, "discounted_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], PromotionCampaign.prototype, "start_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], PromotionCampaign.prototype, "end_date", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PromotionCampaign.prototype, "image_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', enum: ['draft', 'pending', 'active', 'paused', 'completed'] }),
    __metadata("design:type", String)
], PromotionCampaign.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], PromotionCampaign.prototype, "target_parameters", void 0);
exports.PromotionCampaign = PromotionCampaign = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'promotioncampaigns' })
], PromotionCampaign);
exports.PromotionCampaignSchema = mongoose_1.SchemaFactory.createForClass(PromotionCampaign);
//# sourceMappingURL=promotion-campaign.schema.js.map