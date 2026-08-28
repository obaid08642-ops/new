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
exports.AdPlacementSchema = exports.AdPlacement = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let AdPlacement = class AdPlacement {
};
exports.AdPlacement = AdPlacement;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], AdPlacement.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AdPlacement.prototype, "providerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], AdPlacement.prototype, "bidAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], AdPlacement.prototype, "dailyBudget", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], AdPlacement.prototype, "targetedKeywords", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'paused'], default: 'active', index: true }),
    __metadata("design:type", String)
], AdPlacement.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], AdPlacement.prototype, "impressionsCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], AdPlacement.prototype, "clicksCount", void 0);
exports.AdPlacement = AdPlacement = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'ad_placements' })
], AdPlacement);
exports.AdPlacementSchema = mongoose_1.SchemaFactory.createForClass(AdPlacement);
//# sourceMappingURL=ad-placement.schema.js.map