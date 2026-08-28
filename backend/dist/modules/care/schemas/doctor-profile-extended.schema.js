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
exports.DoctorProfileExtendedSchema = exports.DoctorProfileExtended = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let DoctorProfileExtended = class DoctorProfileExtended {
};
exports.DoctorProfileExtended = DoctorProfileExtended;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, unique: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DoctorProfileExtended.prototype, "doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', default: null, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DoctorProfileExtended.prototype, "parent_provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', default: null, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DoctorProfileExtended.prototype, "affiliated_hospital_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], DoctorProfileExtended.prototype, "price_clinic", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], DoctorProfileExtended.prototype, "price_online", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], DoctorProfileExtended.prototype, "price_home", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 10 }),
    __metadata("design:type", Number)
], DoctorProfileExtended.prototype, "max_home_visit_radius_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], DoctorProfileExtended.prototype, "accepted_insurance_networks", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], DoctorProfileExtended.prototype, "clinic_gallery_images", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], DoctorProfileExtended.prototype, "weekly_schedule_template", void 0);
exports.DoctorProfileExtended = DoctorProfileExtended = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], DoctorProfileExtended);
exports.DoctorProfileExtendedSchema = mongoose_1.SchemaFactory.createForClass(DoctorProfileExtended);
//# sourceMappingURL=doctor-profile-extended.schema.js.map