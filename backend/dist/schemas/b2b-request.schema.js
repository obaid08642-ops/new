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
exports.B2BRequestSchema = exports.B2BRequest = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let B2BRequest = class B2BRequest {
};
exports.B2BRequest = B2BRequest;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], B2BRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], B2BRequest.prototype, "pharmacy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], B2BRequest.prototype, "total_items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'manual' }),
    __metadata("design:type", String)
], B2BRequest.prototype, "input_method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', index: true }),
    __metadata("design:type", String)
], B2BRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], B2BRequest.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Array, default: [] }),
    __metadata("design:type", Array)
], B2BRequest.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], B2BRequest.prototype, "submitted", void 0);
exports.B2BRequest = B2BRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'b2b_requests' })
], B2BRequest);
exports.B2BRequestSchema = mongoose_1.SchemaFactory.createForClass(B2BRequest);
//# sourceMappingURL=b2b-request.schema.js.map