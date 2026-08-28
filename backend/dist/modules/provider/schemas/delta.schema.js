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
exports.ProviderDeltaSchema = exports.ProviderDelta = exports.DeltaStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
var DeltaStatus;
(function (DeltaStatus) {
    DeltaStatus["PENDING"] = "pending";
    DeltaStatus["APPROVED"] = "approved";
    DeltaStatus["REJECTED"] = "rejected";
})(DeltaStatus || (exports.DeltaStatus = DeltaStatus = {}));
let ProviderDelta = class ProviderDelta extends mongoose_2.Document {
};
exports.ProviderDelta = ProviderDelta;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderDelta.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderDelta.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], ProviderDelta.prototype, "changes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(DeltaStatus), default: DeltaStatus.PENDING }),
    __metadata("design:type", String)
], ProviderDelta.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderDelta.prototype, "rejection_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderDelta.prototype, "reviewed_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderDelta.prototype, "reviewed_at", void 0);
exports.ProviderDelta = ProviderDelta = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_deltas' })
], ProviderDelta);
exports.ProviderDeltaSchema = mongoose_1.SchemaFactory.createForClass(ProviderDelta);
//# sourceMappingURL=delta.schema.js.map