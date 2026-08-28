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
exports.DrugRejectionLogSchema = exports.DrugRejectionLog = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let DrugRejectionLog = class DrugRejectionLog {
};
exports.DrugRejectionLog = DrugRejectionLog;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], DrugRejectionLog.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DrugRejectionLog.prototype, "medicine_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DrugRejectionLog.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DrugRejectionLog.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['reject', 'accept'], index: true }),
    __metadata("design:type", String)
], DrugRejectionLog.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], DrugRejectionLog.prototype, "timestamp", void 0);
exports.DrugRejectionLog = DrugRejectionLog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_drug_rejection_logs' })
], DrugRejectionLog);
exports.DrugRejectionLogSchema = mongoose_1.SchemaFactory.createForClass(DrugRejectionLog);
exports.DrugRejectionLogSchema.index({ medicine_id: 1, type: 1, timestamp: -1 });
//# sourceMappingURL=drug-rejection-log.schema.js.map