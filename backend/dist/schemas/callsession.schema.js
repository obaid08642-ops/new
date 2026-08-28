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
exports.CallSessionSchema = exports.CallSession = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let CallSession = class CallSession {
};
exports.CallSession = CallSession;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true, index: true }),
    __metadata("design:type", String)
], CallSession.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CallSession.prototype, "appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CallSession.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CallSession.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CallSession.prototype, "room_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'video' }),
    __metadata("design:type", String)
], CallSession.prototype, "call_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'INITIATED', index: true }),
    __metadata("design:type", String)
], CallSession.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CallSession.prototype, "started_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CallSession.prototype, "ended_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], CallSession.prototype, "duration_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CallSession.prototype, "end_reason", void 0);
exports.CallSession = CallSession = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CallSession);
exports.CallSessionSchema = mongoose_1.SchemaFactory.createForClass(CallSession);
//# sourceMappingURL=callsession.schema.js.map