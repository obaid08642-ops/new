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
exports.AmbulanceVehicleSchema = exports.AmbulanceVehicle = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let AmbulanceVehicle = class AmbulanceVehicle {
};
exports.AmbulanceVehicle = AmbulanceVehicle;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], AmbulanceVehicle.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AmbulanceVehicle.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AmbulanceVehicle.prototype, "plate_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AmbulanceVehicle.prototype, "model", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AmbulanceVehicle.prototype, "year", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], AmbulanceVehicle.prototype, "equipment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], AmbulanceVehicle.prototype, "paramedic_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], AmbulanceVehicle.prototype, "has_icu", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['BLS', 'ALS', 'ICU'], default: 'BLS', index: true }),
    __metadata("design:type", String)
], AmbulanceVehicle.prototype, "vehicle_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number, updated_at: Date }, _id: false }),
    __metadata("design:type", Object)
], AmbulanceVehicle.prototype, "last_location", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AmbulanceVehicle.prototype, "base_city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], AmbulanceVehicle.prototype, "documents", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true }),
    __metadata("design:type", String)
], AmbulanceVehicle.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AmbulanceVehicle.prototype, "admin_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AmbulanceVehicle.prototype, "reviewed_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], AmbulanceVehicle.prototype, "reviewed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], AmbulanceVehicle.prototype, "is_available", void 0);
exports.AmbulanceVehicle = AmbulanceVehicle = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'ambulance_vehicles' })
], AmbulanceVehicle);
exports.AmbulanceVehicleSchema = mongoose_1.SchemaFactory.createForClass(AmbulanceVehicle);
//# sourceMappingURL=ambulance-vehicle.schema.js.map