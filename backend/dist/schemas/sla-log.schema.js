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
exports.SlaLogSchema = exports.SlaLog = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let SlaLog = class SlaLog {
};
exports.SlaLog = SlaLog;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], SlaLog.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SlaLog.prototype, "providerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SlaLog.prototype, "orderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], SlaLog.prototype, "durationSeconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], SlaLog.prototype, "slaLimit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: false, index: true }),
    __metadata("design:type", Boolean)
], SlaLog.prototype, "isBreached", void 0);
exports.SlaLog = SlaLog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'sla_logs' })
], SlaLog);
exports.SlaLogSchema = mongoose_1.SchemaFactory.createForClass(SlaLog);
//# sourceMappingURL=sla-log.schema.js.map