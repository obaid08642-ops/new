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
exports.ProcurementRequestSchema = exports.ProcurementRequest = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ProcurementRequest = class ProcurementRequest {
};
exports.ProcurementRequest = ProcurementRequest;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], ProcurementRequest.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], ProcurementRequest.prototype, "created_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                medicine_id: { type: mongoose_2.Types.ObjectId, ref: 'Medicine', default: null },
                raw_name_string: { type: String, required: true },
                requested_quantity: { type: Number, required: true },
                category_group: { type: String, enum: ['medical', 'non_medical'], default: 'medical' },
                notes: String
            }],
        required: true,
        default: []
    }),
    __metadata("design:type", Array)
], ProcurementRequest.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['DRAFT', 'PENDING_ADMIN_REVIEW', 'QUOTATION_ISSUED', 'APPROVED_BY_PHARMACY', 'CANCELLED', 'COMPLETED'],
        default: 'PENDING_ADMIN_REVIEW',
        index: true
    }),
    __metadata("design:type", String)
], ProcurementRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], ProcurementRequest.prototype, "uploaded_file_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], ProcurementRequest.prototype, "total_warehouse_quotation_price", void 0);
exports.ProcurementRequest = ProcurementRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ProcurementRequest);
exports.ProcurementRequestSchema = mongoose_1.SchemaFactory.createForClass(ProcurementRequest);
//# sourceMappingURL=procurement-request.schema.js.map