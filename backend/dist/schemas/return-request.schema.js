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
exports.ReturnRequestSchema = exports.ReturnRequest = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let ReturnRequest = class ReturnRequest {
};
exports.ReturnRequest = ReturnRequest;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ReturnRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ReturnRequest.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ReturnRequest.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ReturnRequest.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ReturnRequest.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ReturnRequest.prototype, "photo_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' }),
    __metadata("design:type", String)
], ReturnRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ReturnRequest.prototype, "rejection_reason", void 0);
exports.ReturnRequest = ReturnRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'return_requests' })
], ReturnRequest);
exports.ReturnRequestSchema = mongoose_1.SchemaFactory.createForClass(ReturnRequest);
//# sourceMappingURL=return-request.schema.js.map