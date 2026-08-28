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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorIntegrationController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const doctor_profile_extended_schema_1 = require("./schemas/doctor-profile-extended.schema");
const encounter_record_schema_1 = require("./schemas/encounter-record.schema");
let DoctorIntegrationController = class DoctorIntegrationController {
    constructor(doctorProfileModel, encounterModel) {
        this.doctorProfileModel = doctorProfileModel;
        this.encounterModel = encounterModel;
    }
    async synchronizeSettings(payload) {
        const { doctorId, priceClinic, priceOnline, priceHome, maxRadius, networks, images } = payload;
        const profile = await this.doctorProfileModel.findOneAndUpdate({ doctor_id: new mongoose_2.Types.ObjectId(doctorId) }, {
            $set: {
                price_clinic: priceClinic,
                price_online: priceOnline,
                price_home: priceHome,
                max_home_visit_radius_km: maxRadius,
                accepted_insurance_networks: networks,
                clinic_gallery_images: images
            }
        }, { upsert: true, new: true });
        return { success: true, payload: profile };
    }
    async finalizeEncounter(encounterDto) {
        const existingRecord = await this.encounterModel.findOne({ appointment_id: new mongoose_2.Types.ObjectId(encounterDto.appointmentId) });
        if (existingRecord) {
            throw new common_1.ConflictException('Encounter is already finalized. Insurance and clinical records are permanently locked and immutable.');
        }
        const record = await this.encounterModel.create({
            appointment_id: new mongoose_2.Types.ObjectId(encounterDto.appointmentId),
            patient_id: new mongoose_2.Types.ObjectId(encounterDto.patientId),
            doctor_id: new mongoose_2.Types.ObjectId(encounterDto.doctorId),
            diagnosis_text: encounterDto.diagnosisText,
            prescribed_medications: encounterDto.medications,
            insurance_claim_snapshot: encounterDto.insuranceSnapshot
        });
        return { success: true, reference_token: record._id };
    }
};
exports.DoctorIntegrationController = DoctorIntegrationController;
__decorate([
    (0, common_1.Put)('synchronize-settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorIntegrationController.prototype, "synchronizeSettings", null);
__decorate([
    (0, common_1.Post)('finalize-encounter'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorIntegrationController.prototype, "finalizeEncounter", null);
exports.DoctorIntegrationController = DoctorIntegrationController = __decorate([
    (0, common_1.Controller)('provider/doctor-engine'),
    __param(0, (0, mongoose_1.InjectModel)(doctor_profile_extended_schema_1.DoctorProfileExtended.name)),
    __param(1, (0, mongoose_1.InjectModel)(encounter_record_schema_1.EncounterRecord.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], DoctorIntegrationController);
//# sourceMappingURL=doctor-integration.controller.js.map