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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = __importStar(require("mongoose"));
const bcrypt = __importStar(require("bcryptjs"));
const user_schema_1 = require("../schemas/user.schema");
const provider_profile_schema_1 = require("../schemas/provider-profile.schema");
const enums_1 = require("../common/enums");
const uuid_1 = require("uuid");
const MONGO_URL = process.env.MONGO_URL;
function assertTestSeedAllowed() {
    if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_TEST_SEED !== 'true') {
        throw new Error('seed_test_providers is restricted to NODE_ENV=test with ALLOW_TEST_SEED=true');
    }
    if (!MONGO_URL)
        throw new Error('MONGO_URL is required for test seeding');
}
const providersData = [
    {
        phone: '+966500000001',
        role: enums_1.UserRole.DOCTOR,
        type: enums_1.ProviderType.DOCTOR,
        name_ar: 'د. أحمد التجريبي',
        name_en: 'Dr. Ahmed Test',
        details: {
            specialty: 'cardiology',
            academic_degree: 'consultant',
            price_clinic: 300,
            price_online: 200,
            price_home: 500,
            consultation_modes: ['clinic', 'video', 'home'],
        }
    },
    {
        phone: '+966500000002',
        role: enums_1.UserRole.PHARMACY,
        type: enums_1.ProviderType.PHARMACY,
        name_ar: 'صيدلية التجريبية الأولى',
        name_en: 'First Test Pharmacy',
        details: {
            delivery_radius_km: 15,
            delivery_fee: 10,
            min_order_sar: 50,
            has_own_delivery: true,
            delivery_mode: 'self_delivery',
        }
    },
    {
        phone: '+966500000003',
        role: enums_1.UserRole.LAB,
        type: enums_1.ProviderType.LAB,
        name_ar: 'معمل التحاليل التجريبي',
        name_en: 'Test Medical Lab',
        details: {
            test_categories: ['blood', 'urine', 'hormones'],
            home_visit_supported: true,
            home_visit_radius_km: 20,
        }
    },
    {
        phone: '+966500000004',
        role: enums_1.UserRole.RADIOLOGY,
        type: enums_1.ProviderType.RADIOLOGY,
        name_ar: 'مركز الأشعة التجريبي',
        name_en: 'Test Radiology Center',
        details: {
            test_categories: ['xray', 'mri', 'ct'],
            radiation_safety_license: 'RAD-SAFE-100223',
        }
    },
    {
        phone: '+966500000005',
        role: enums_1.UserRole.NURSE,
        type: enums_1.ProviderType.NURSING,
        name_ar: 'ممرض نبض التجريبي',
        name_en: 'Test Home Nurse',
        details: {
            gender: 'male',
            nationality: 'Saudi',
            priceVisit: 150,
            priceHour: 40,
            priceDay: 400,
            home_visit_supported: true,
        }
    },
    {
        phone: '+966500000006',
        role: enums_1.UserRole.HOSPITAL,
        type: enums_1.ProviderType.HOSPITAL,
        name_ar: 'مستشفى نبضة التجريبي',
        name_en: 'Test Nabdah Hospital',
        details: {
            departments: ['cardiology', 'pediatrics', 'dermatology', 'general_surgery'],
            accepts_insurance: true,
        }
    }
];
async function seed() {
    assertTestSeedAllowed();
    await mongoose.connect(MONGO_URL);
    const UserModel = mongoose.model('User', user_schema_1.UserSchema);
    const ProviderModel = mongoose.model('ProviderProfile', provider_profile_schema_1.ProviderProfileSchema);
    const passwordHash = await bcrypt.hash('Test@1234', 12);
    for (const prov of providersData) {
        let user = await UserModel.findOne({ phone: prov.phone });
        if (!user) {
            user = await UserModel.create({
                id: (0, uuid_1.v4)(),
                full_name: prov.name_en,
                phone: prov.phone,
                password_hash: passwordHash,
                role: prov.role,
                active: true,
                verified: true,
                city: 'Riyadh',
                district: 'Al-Malqa',
            });
        }
        else {
            user.password_hash = passwordHash;
            user.role = prov.role;
            user.active = true;
            user.verified = true;
            await user.save();
        }
        let profile = await ProviderModel.findOne({ user_id: user.id });
        if (!profile) {
            await ProviderModel.create({
                id: (0, uuid_1.v4)(),
                user_id: user.id,
                account_id: user.id,
                type: prov.type,
                status: enums_1.ProviderStatus.ACTIVE,
                name_ar: prov.name_ar,
                name_en: prov.name_en,
                city: 'Riyadh',
                district: 'Al-Malqa',
                license_verified: true,
                approved_at: new Date(),
                rating: 4.9,
                reviews_count: 32,
                location: { lat: 24.7963, lng: 46.6128 },
                ...prov.details
            });
        }
        else {
            profile.type = prov.type;
            profile.status = enums_1.ProviderStatus.ACTIVE;
            profile.name_ar = prov.name_ar;
            profile.name_en = prov.name_en;
            profile.license_verified = true;
            profile.approved_at = new Date();
            Object.assign(profile, prov.details);
            await profile.save();
        }
    }
    await mongoose.disconnect();
}
seed().catch(err => {
    console.error('Failed to seed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed_test_providers.js.map