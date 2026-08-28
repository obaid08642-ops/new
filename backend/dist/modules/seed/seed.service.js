"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const enums_1 = require("../../common/enums");
const seed_data_1 = require("./seed.data");
const seed_facilities_1 = require("./seed.facilities");
const labs_seed_1 = require("../labs/labs.seed");
const user_repository_1 = require("./repositories/user.repository");
const patientprofile_repository_1 = require("./repositories/patientprofile.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const medicine_repository_1 = require("./repositories/medicine.repository");
const pharmacyinventory_repository_1 = require("./repositories/pharmacyinventory.repository");
const facility_repository_1 = require("./repositories/facility.repository");
const labservice_repository_1 = require("./repositories/labservice.repository");
const systemconfig_repository_1 = require("./repositories/systemconfig.repository");
let SeedService = class SeedService {
    constructor(userModel, patientModel, providerModel, medModel, invModel, facilityModel, labSvcModel, configModel) {
        this.userModel = userModel;
        this.patientModel = patientModel;
        this.providerModel = providerModel;
        this.medModel = medModel;
        this.invModel = invModel;
        this.facilityModel = facilityModel;
        this.labSvcModel = labSvcModel;
        this.configModel = configModel;
        this.logger = new common_1.Logger('Seed');
    }
    async onModuleInit() {
        try {
            await this.seedSystemConfig();
            await this.seedMedicines();
            await this.seedLabs();
            const testSeedEnabled = process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_SEED === 'true';
            if (testSeedEnabled) {
                await this.seedPatient();
                await this.seedPharmacies();
                await this.seedFacilities();
                await this.seedDoctors();
                await this.seedExtraProviders();
                await this.seedDelivery();
                await this.seedInventory();
                this.logger.log('Seed complete — idempotent test data enabled explicitly');
            }
            else {
                this.logger.log('Seed complete — reference data only (demo identities skipped outside explicit test mode)');
            }
        }
        catch (e) {
            this.logger.error(`Seed failed: ${e.message}`);
        }
    }
    async seedFacilities() {
        for (const f of seed_facilities_1.SEED_FACILITIES) {
            await this.facilityModel.updateOne({ name_ar: f.name_ar }, { $set: { ...f, is_active: true } }, { upsert: true });
        }
    }
    async seedMedicines() {
        for (const m of seed_data_1.SEED_MEDICINES) {
            await this.medModel.updateOne({ name_ar: m.name_ar }, { $setOnInsert: { ...m, source: 'master' } }, { upsert: true });
        }
    }
    async seedPatient() {
        for (const p of seed_data_1.SEED_USERS) {
            const exists = await this.userModel.findOne({ phone: p.phone });
            if (exists)
                continue;
            const hash = await bcrypt.hash(p.password, 12);
            const u = await this.userModel.create({
                full_name: p.full_name,
                phone: p.phone,
                password_hash: hash,
                role: enums_1.UserRole.PATIENT,
                city: p.city, district: p.district,
            });
            await this.patientModel.create({
                user_id: u.id, age: 32, gender: 'male', blood_type: 'O+',
                chronic_diseases: ['ضغط دم'],
                emergency_contacts: [{ name: 'والدة', phone: '+966500000111', relation: 'أسرة' }],
            });
        }
    }
    async seedPharmacies() {
        for (const ph of seed_data_1.SEED_PHARMACIES) {
            const exists = await this.userModel.findOne({ phone: ph.phone });
            if (exists)
                continue;
            const hash = await bcrypt.hash(ph.password, 12);
            const u = await this.userModel.create({
                full_name: ph.full_name,
                phone: ph.phone,
                password_hash: hash,
                role: enums_1.UserRole.PHARMACY,
                city: ph.city, district: ph.district,
                location: ph.location,
            });
            await this.providerModel.create({
                user_id: u.id,
                account_id: u.id,
                type: enums_1.ProviderType.PHARMACY,
                status: enums_1.ProviderStatus.ACTIVE,
                name_ar: ph.name_ar,
                name_en: ph.name_en,
                pharmacy_chain: ph.pharmacy_chain,
                city: ph.city,
                district: ph.district,
                location: ph.location,
                has_own_drivers: ph.has_own_drivers,
                delivery_radius_km: ph.delivery_radius_km,
                rating: ph.rating,
                license_verified: true,
                working_hours: ph.working_hours,
                approved_at: new Date(),
            });
        }
    }
    async seedDoctors() {
        for (const d of seed_data_1.SEED_DOCTORS) {
            let user = await this.userModel.findOne({ phone: d.phone });
            if (!user) {
                const hash = await bcrypt.hash(d.password, 12);
                user = await this.userModel.create({
                    full_name: d.full_name, phone: d.phone, password_hash: hash,
                    role: enums_1.UserRole.DOCTOR, city: d.city, district: d.district,
                });
            }
            let facility_id;
            const fs = d.facility_slug;
            if (fs) {
                const facilityNameAr = seed_facilities_1.SEED_FACILITIES.find((f) => f.slug === fs)?.name_ar;
                if (facilityNameAr) {
                    const facility = await this.facilityModel.findOne({ name_ar: facilityNameAr });
                    if (facility)
                        facility_id = facility.id;
                }
            }
            const update = {
                user_id: user.id,
                account_id: user.id,
                type: enums_1.ProviderType.DOCTOR,
                status: enums_1.ProviderStatus.ACTIVE,
                name_ar: d.name_ar, name_en: d.name_en,
                specialty: d.specialty, title: d.title, license_number: d.license_number,
                years_experience: d.years_experience, city: d.city, district: d.district,
                consultation_modes: d.consultation_modes,
                price_clinic: d.price_clinic, price_online: d.price_online, price_home: d.price_home,
                rating: d.rating, license_verified: true, approved_at: new Date(),
                hospital: d.hospital,
                facility_id,
                academic_degree: d.academic_degree,
                bio: d.bio,
                languages: d.languages || [],
                location: d.location,
                accepts_insurance: !!d.accepts_insurance,
                accepted_insurance: d.accepted_insurance || [],
                working_hours: d.working_hours || [],
            };
            await this.providerModel.updateOne({ user_id: user.id, type: enums_1.ProviderType.DOCTOR }, { $set: update }, { upsert: true });
        }
    }
    async seedExtraProviders() {
        const hospPhone = '+966555000004';
        let hospUser = await this.userModel.findOne({ phone: hospPhone });
        if (!hospUser) {
            const hash = await bcrypt.hash('Hospital@123', 12);
            hospUser = await this.userModel.create({
                full_name: 'مستشفى الملك فيصل التخصصي', phone: hospPhone, password_hash: hash,
                role: enums_1.UserRole.HOSPITAL, city: 'الرياض', district: 'العليا',
            });
            await this.providerModel.create({
                user_id: hospUser.id, account_id: hospUser.id,
                type: enums_1.ProviderType.HOSPITAL, status: enums_1.ProviderStatus.ACTIVE,
                name_ar: 'مستشفى الملك فيصل التخصصي', name_en: 'King Faisal Specialist Hospital',
                city: 'الرياض', district: 'العليا', location: { lat: 24.7142, lng: 46.6859 },
                license_verified: true, approved_at: new Date(),
            });
        }
        const labPhone = '+966555000005';
        let labUser = await this.userModel.findOne({ phone: labPhone });
        if (!labUser) {
            const hash = await bcrypt.hash('Lab@123', 12);
            labUser = await this.userModel.create({
                full_name: 'معمل نبض الطبي', phone: labPhone, password_hash: hash,
                role: enums_1.UserRole.LAB, city: 'الرياض', district: 'العليا',
            });
            await this.providerModel.create({
                user_id: labUser.id, account_id: labUser.id,
                type: enums_1.ProviderType.LAB, status: enums_1.ProviderStatus.ACTIVE,
                name_ar: 'معمل نبض الطبي', name_en: 'Nabd Medical Lab',
                city: 'الرياض', district: 'العليا', location: { lat: 24.7136, lng: 46.6753 },
                license_verified: true, approved_at: new Date(),
            });
        }
        const radPhone = '+966555000006';
        let radUser = await this.userModel.findOne({ phone: radPhone });
        if (!radUser) {
            const hash = await bcrypt.hash('Radiology@123', 12);
            radUser = await this.userModel.create({
                full_name: 'مركز نبض للأشعة', phone: radPhone, password_hash: hash,
                role: enums_1.UserRole.RADIOLOGY, city: 'الرياض', district: 'العليا',
            });
            await this.providerModel.create({
                user_id: radUser.id, account_id: radUser.id,
                type: enums_1.ProviderType.RADIOLOGY, status: enums_1.ProviderStatus.ACTIVE,
                name_ar: 'مركز نبض للأشعة', name_en: 'Nabd Radiology Center',
                city: 'الرياض', district: 'العليا', location: { lat: 24.7130, lng: 46.6740 },
                license_verified: true, approved_at: new Date(),
            });
        }
        const nursePhone = '+966555000007';
        let nurseUser = await this.userModel.findOne({ phone: nursePhone });
        if (!nurseUser) {
            const hash = await bcrypt.hash('Nurse@123', 12);
            nurseUser = await this.userModel.create({
                full_name: 'ممرض نبض المنزلي', phone: nursePhone, password_hash: hash,
                role: enums_1.UserRole.NURSE, city: 'الرياض', district: 'العليا',
            });
            await this.providerModel.create({
                user_id: nurseUser.id, account_id: nurseUser.id,
                type: enums_1.ProviderType.HOME_CARE, status: enums_1.ProviderStatus.ACTIVE,
                name_ar: 'ممرض نبض المنزلي', name_en: 'Nabd Home Nurse',
                city: 'الرياض', district: 'العليا', location: { lat: 24.7120, lng: 46.6720 },
                license_verified: true, approved_at: new Date(),
            });
        }
    }
    async seedDelivery() {
        for (const dd of seed_data_1.SEED_DELIVERY) {
            const exists = await this.userModel.findOne({ phone: dd.phone });
            if (exists)
                continue;
            const hash = await bcrypt.hash(dd.password, 12);
            await this.userModel.create({
                full_name: dd.full_name, phone: dd.phone, password_hash: hash,
                role: enums_1.UserRole.DELIVERY, city: dd.city, active: true,
            });
        }
    }
    async seedInventory() {
        const existing = await this.invModel.countDocuments();
        if (existing > 0)
            return;
        const pharmacies = await this.providerModel.find({ type: enums_1.ProviderType.PHARMACY });
        const medicines = await this.medModel.find({});
        if (pharmacies.length === 0 || medicines.length === 0)
            return;
        const rows = [];
        for (let pIdx = 0; pIdx < pharmacies.length; pIdx++) {
            const ph = pharmacies[pIdx];
            for (let mIdx = 0; mIdx < medicines.length; mIdx++) {
                const med = medicines[mIdx];
                const carries = ((mIdx + pIdx) % 5) !== 0;
                if (!carries)
                    continue;
                rows.push({
                    pharmacy_id: ph.user_id,
                    medicine_id: med.id,
                    stock_qty: 5 + ((mIdx * 7 + pIdx * 13) % 25),
                    price: med.price,
                    is_available: true,
                    last_restocked_at: new Date(),
                });
            }
        }
        if (rows.length > 0) {
            await this.invModel.insertMany(rows, { ordered: false }).catch(() => { });
            this.logger.log(`Seeded ${rows.length} pharmacy inventory rows`);
        }
    }
    async seedLabs() {
        const existing = await this.labSvcModel.countDocuments();
        if (existing >= labs_seed_1.LAB_SEED.length)
            return;
        const docs = labs_seed_1.LAB_SEED.map((x) => ({ ...x, active: true }));
        await this.labSvcModel.insertMany(docs, { ordered: false }).catch(() => { });
        this.logger.log(`Seeded ${docs.length} lab services`);
    }
    async seedSystemConfig() {
        const key = 'pharmacy_broadcast_stages';
        const exists = await this.configModel.findOne({ key });
        if (!exists) {
            await this.configModel.create({
                key,
                value: [
                    { stage: 1, radius_km: 3, timeout_seconds: 90 },
                    { stage: 2, radius_km: 5, timeout_seconds: 90 },
                    { stage: 3, radius_km: 7, timeout_seconds: 90 }
                ]
            });
            this.logger.log('Seeded default pharmacy broadcast stages config');
        }
        const mainKey = 'system_config';
        const mainExists = await this.configModel.findOne({ key: mainKey });
        if (!mainExists) {
            await this.configModel.create({
                key: mainKey,
                value: {
                    consultation_followup_hours: 24
                }
            });
            this.logger.log('Seeded default system config (follow-up hours)');
        }
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('UserRepository')),
    __param(1, (0, common_1.Inject)('PatientProfileRepository')),
    __param(2, (0, common_1.Inject)('ProviderProfileRepository')),
    __param(3, (0, common_1.Inject)('MedicineRepository')),
    __param(4, (0, common_1.Inject)('PharmacyInventoryRepository')),
    __param(5, (0, common_1.Inject)('FacilityRepository')),
    __param(6, (0, common_1.Inject)('LabServiceRepository')),
    __param(7, (0, common_1.Inject)('SystemConfigRepository')),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        patientprofile_repository_1.PatientProfileRepository,
        providerprofile_repository_1.ProviderProfileRepository,
        medicine_repository_1.MedicineRepository,
        pharmacyinventory_repository_1.PharmacyInventoryRepository,
        facility_repository_1.FacilityRepository,
        labservice_repository_1.LabServiceRepository,
        systemconfig_repository_1.SystemConfigRepository])
], SeedService);
//# sourceMappingURL=seed.service.js.map