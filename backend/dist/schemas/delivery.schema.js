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
exports.DeliverySchema = exports.Delivery = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const enums_1 = require("../common/enums");
const uuid_1 = require("uuid");
let Delivery = class Delivery {
};
exports.Delivery = Delivery;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Delivery.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Delivery.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Delivery.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Delivery.prototype, "driver_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enums_1.DeliveryState), default: enums_1.DeliveryState.UNASSIGNED, index: true }),
    __metadata("design:type", String)
], Delivery.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number, address: String }, _id: false }),
    __metadata("design:type", Object)
], Delivery.prototype, "pickup", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number, address: String }, _id: false }),
    __metadata("design:type", Object)
], Delivery.prototype, "dropoff", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number }, _id: false }),
    __metadata("design:type", Object)
], Delivery.prototype, "current_location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Delivery.prototype, "attempts", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Delivery.prototype, "eta_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Delivery.prototype, "fee", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Delivery.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Delivery.prototype, "signature", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Delivery.prototype, "photo_proof", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Delivery.prototype, "delivered_at", void 0);
exports.Delivery = Delivery = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'deliveries' })
], Delivery);
exports.DeliverySchema = mongoose_1.SchemaFactory.createForClass(Delivery);
//# sourceMappingURL=delivery.schema.js.map