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
exports.MedicalProfileService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const medicalprofile_repository_1 = require("./repositories/medicalprofile.repository");
let MedicalProfileService = class MedicalProfileService {
    constructor(model) {
        this.model = model;
    }
    async getOrCreate(user) {
        let p = await this.model.findOne({ patient_id: user.id });
        if (!p) {
            p = await this.model.create({ patient_id: user.id, gender: 'unspecified' });
        }
        return p;
    }
    async update(user, body) {
        const allowed = ['blood_type', 'height_cm', 'weight_kg', 'birth_date', 'gender', 'is_pregnant', 'pregnancy_weeks', 'is_breastfeeding', 'is_smoker', 'drinks_alcohol', 'chronic_diseases', 'allergies', 'surgeries', 'long_term_medications', 'family_history', 'dependents', 'emergency_contact', 'notes'];
        const $set = { last_updated_at: new Date(), last_updated_by_id: user.id };
        for (const k of allowed)
            if (body[k] !== undefined)
                $set[k] = body[k];
        const p = await this.model.findOneAndUpdate({ patient_id: user.id }, { $set }, { new: true, upsert: true });
        return p.toObject();
    }
    async getForPatient(user, patientId) {
        void user;
        void patientId;
        throw new common_2.ForbiddenException('Provider medical-profile access requires an approved consent contract.');
    }
    async addItem(user, list, item) {
        const p = await this.getOrCreate(user);
        p[list] = [...(p[list] || []), { ...item, id: require('uuid').v4(), added_at: new Date() }];
        p.last_updated_at = new Date();
        p.last_updated_by_id = user.id;
        await p.save();
        return p.toObject();
    }
    async removeItem(user, list, itemId) {
        const p = await this.getOrCreate(user);
        p[list] = (p[list] || []).filter((x) => x.id !== itemId);
        p.last_updated_at = new Date();
        p.last_updated_by_id = user.id;
        await p.save();
        return p.toObject();
    }
};
exports.MedicalProfileService = MedicalProfileService;
exports.MedicalProfileService = MedicalProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('MedicalProfileRepository')),
    __metadata("design:paramtypes", [medicalprofile_repository_1.MedicalProfileRepository])
], MedicalProfileService);
//# sourceMappingURL=medical-profile.service.js.map