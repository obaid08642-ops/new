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
exports.MedicalSupplyRequestSchema = exports.MedicalSupplyRequest = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let MedicalSupplyRequest = class MedicalSupplyRequest {
};
exports.MedicalSupplyRequest = MedicalSupplyRequest;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'HomeCareBooking', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], MedicalSupplyRequest.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], MedicalSupplyRequest.prototype, "nurse_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                item_name: { type: String, required: true },
                quantity: { type: Number, required: true },
                unit: { type: String, default: 'pcs' },
                status: { type: String, enum: ['PENDING', 'APPROVED', 'DISPATCHED', 'DELIVERED'], default: 'PENDING' }
            }],
        required: true,
        default: []
    }),
    __metadata("design:type", Array)
], MedicalSupplyRequest.prototype, "requested_items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'NORMAL', enum: ['NORMAL', 'URGENT', 'CRITICAL'] }),
    __metadata("design:type", String)
], MedicalSupplyRequest.prototype, "priority", void 0);
exports.MedicalSupplyRequest = MedicalSupplyRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], MedicalSupplyRequest);
exports.MedicalSupplyRequestSchema = mongoose_1.SchemaFactory.createForClass(MedicalSupplyRequest);
//# sourceMappingURL=medical-supply-request.schema.js.map