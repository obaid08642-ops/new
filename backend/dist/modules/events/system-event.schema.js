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
exports.SystemEventSchema = exports.SystemEvent = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
let SystemEvent = class SystemEvent extends mongoose_2.Document {
};
exports.SystemEvent = SystemEvent;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], SystemEvent.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SystemEvent.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SystemEvent.prototype, "entity_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SystemEvent.prototype, "entity_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, sparse: true, index: true }),
    __metadata("design:type", String)
], SystemEvent.prototype, "idempotency_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], SystemEvent.prototype, "actor_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], SystemEvent.prototype, "actor_role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], SystemEvent.prototype, "reason_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], SystemEvent.prototype, "patient_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], SystemEvent.prototype, "pharmacy_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], SystemEvent.prototype, "before", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], SystemEvent.prototype, "after", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], SystemEvent.prototype, "meta", void 0);
exports.SystemEvent = SystemEvent = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'system_events' })
], SystemEvent);
exports.SystemEventSchema = mongoose_1.SchemaFactory.createForClass(SystemEvent);
exports.SystemEventSchema.index({ entity_type: 1, entity_id: 1, createdAt: -1 });
exports.SystemEventSchema.index({ patient_account_id: 1, createdAt: -1 });
exports.SystemEventSchema.index({ pharmacy_account_id: 1, createdAt: -1 });
exports.SystemEventSchema.index({ type: 1, createdAt: -1 });
//# sourceMappingURL=system-event.schema.js.map