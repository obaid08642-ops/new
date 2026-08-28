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
exports.EncounterReferralSchema = exports.EncounterReferral = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let EncounterReferral = class EncounterReferral {
};
exports.EncounterReferral = EncounterReferral;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Appointment', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], EncounterReferral.prototype, "appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], EncounterReferral.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], EncounterReferral.prototype, "doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], EncounterReferral.prototype, "requested_lab_tests", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], EncounterReferral.prototype, "requested_radiology_scans", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], EncounterReferral.prototype, "home_care_recommendation_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false, index: true }),
    __metadata("design:type", Boolean)
], EncounterReferral.prototype, "diagnostic_results_returned", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], EncounterReferral.prototype, "returned_results_file_urls", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['public_radius_broadcast', 'hospital_internal_dispatch'], default: 'public_radius_broadcast' }),
    __metadata("design:type", String)
], EncounterReferral.prototype, "prescription_routing_status", void 0);
exports.EncounterReferral = EncounterReferral = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], EncounterReferral);
exports.EncounterReferralSchema = mongoose_1.SchemaFactory.createForClass(EncounterReferral);
//# sourceMappingURL=encounter-referrals.schema.js.map