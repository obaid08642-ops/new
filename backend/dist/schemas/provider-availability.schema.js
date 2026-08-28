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
exports.ProviderAvailabilitySchema = exports.ProviderAvailability = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let ProviderAvailability = class ProviderAvailability {
};
exports.ProviderAvailability = ProviderAvailability;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], ProviderAvailability.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true, unique: true }),
    __metadata("design:type", String)
], ProviderAvailability.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ProviderAvailability.prototype, "working_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ProviderAvailability.prototype, "blocked_slots", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: null }),
    __metadata("design:type", Object)
], ProviderAvailability.prototype, "vacation_mode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ProviderAvailability.prototype, "instant_available", void 0);
exports.ProviderAvailability = ProviderAvailability = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ProviderAvailability);
exports.ProviderAvailabilitySchema = mongoose_1.SchemaFactory.createForClass(ProviderAvailability);
//# sourceMappingURL=provider-availability.schema.js.map