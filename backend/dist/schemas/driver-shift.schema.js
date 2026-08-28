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
exports.DriverShiftSchema = exports.DriverShift = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let DriverShift = class DriverShift {
};
exports.DriverShift = DriverShift;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true, index: true }),
    __metadata("design:type", String)
], DriverShift.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DriverShift.prototype, "driver_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'online', enum: ['online', 'offline', 'on_delivery'] }),
    __metadata("design:type", String)
], DriverShift.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], DriverShift.prototype, "started_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], DriverShift.prototype, "ended_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: null }),
    __metadata("design:type", Object)
], DriverShift.prototype, "current_location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], DriverShift.prototype, "deliveries_completed", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], DriverShift.prototype, "earnings", void 0);
exports.DriverShift = DriverShift = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], DriverShift);
exports.DriverShiftSchema = mongoose_1.SchemaFactory.createForClass(DriverShift);
//# sourceMappingURL=driver-shift.schema.js.map