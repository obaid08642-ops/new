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
exports.PharmacyInventorySchema = exports.PharmacyInventory = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let PharmacyInventory = class PharmacyInventory {
};
exports.PharmacyInventory = PharmacyInventory;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyInventory.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyInventory.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyInventory.prototype, "drug_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], PharmacyInventory.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyInventory.prototype, "stock_quantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PharmacyInventory.prototype, "is_online", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyInventory.prototype, "expiry_date", void 0);
exports.PharmacyInventory = PharmacyInventory = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_inventory' })
], PharmacyInventory);
exports.PharmacyInventorySchema = mongoose_1.SchemaFactory.createForClass(PharmacyInventory);
exports.PharmacyInventorySchema.index({ pharmacy_id: 1, drug_id: 1 }, { unique: true });
//# sourceMappingURL=pharmacy-inventory.schema.js.map