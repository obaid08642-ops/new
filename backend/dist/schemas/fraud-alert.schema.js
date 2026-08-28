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
exports.FraudAlertSchema = exports.FraudAlert = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let FraudAlert = class FraudAlert {
};
exports.FraudAlert = FraudAlert;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], FraudAlert.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], FraudAlert.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], FraudAlert.prototype, "providerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['duplicate_reviews_same_ip', 'rapid_bookings'], index: true }),
    __metadata("design:type", String)
], FraudAlert.prototype, "flagType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], FraudAlert.prototype, "confidenceScore", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['pending', 'flagged', 'dismissed'], default: 'pending', index: true }),
    __metadata("design:type", String)
], FraudAlert.prototype, "status", void 0);
exports.FraudAlert = FraudAlert = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'fraud_alerts' })
], FraudAlert);
exports.FraudAlertSchema = mongoose_1.SchemaFactory.createForClass(FraudAlert);
//# sourceMappingURL=fraud-alert.schema.js.map