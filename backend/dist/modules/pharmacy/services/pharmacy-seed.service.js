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
exports.PharmacySeedService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const bcrypt = __importStar(require("bcryptjs"));
const pharmacy_schema_1 = require("../schemas/pharmacy.schema");
const requests_schema_1 = require("../../provider/schemas/requests.schema");
const pharmacyorder_repository_1 = require("./repositories/pharmacyorder.repository");
const pharmacyinventoryitem_repository_1 = require("./repositories/pharmacyinventoryitem.repository");
const provideraccount_repository_1 = require("./repositories/provideraccount.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const provideravailability_repository_1 = require("./repositories/provideravailability.repository");
const provider_enums_1 = require("../../provider/provider.enums");
function assertAdmin(u) { if (!u || u.role !== 'admin')
    throw new common_1.ForbiddenException('admin_required'); }
let PharmacySeedService = class PharmacySeedService {
    constructor(orders, inv, accounts, profiles, avails) {
        this.orders = orders;
        this.inv = inv;
        this.accounts = accounts;
        this.profiles = profiles;
        this.avails = avails;
    }
    assertTestSeedAllowed() {
        if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_TEST_SEED !== 'true') {
            throw new common_1.ForbiddenException('test_seed_only');
        }
    }
    async seed(user) {
        assertAdmin(user);
        this.assertTestSeedAllowed();
        const created = [];
        const pharmacies = [
            {
                email: 'pharma-north+phase2@test.com',
                business_name: 'صيدلية الشمال',
                district: 'الملقا',
                geo: { lat: 24.8200, lng: 46.6300 },
                inventory: [
                    { sku: 'PAN-EXT-500', stock: 50, price: 18, name_ar: 'بانادول إكسترا 500 ملغ', generic_name: 'Paracetamol+Caffeine', dosage: '500mg', form: 'tablet' },
                    { sku: 'AMOXIL-500', stock: 0, price: 26, name_ar: 'أموكسيل 500 ملغ', generic_name: 'Amoxicillin', dosage: '500mg', form: 'capsule' },
                    { sku: 'VITC-1000', stock: 200, price: 30, name_ar: 'فيتامين سي 1000', generic_name: 'Ascorbic Acid', dosage: '1000mg', form: 'tablet' },
                    { sku: 'AUGMENTIN-625', stock: 30, price: 45, name_ar: 'أوجمنتين 625 ملغ', generic_name: 'Amoxicillin+Clavulanate', dosage: '625mg', form: 'tablet', substitute_skus: ['AMOXIL-500'] },
                ],
            },
            {
                email: 'pharma-east+phase2@test.com',
                business_name: 'صيدلية الشرق',
                district: 'النخيل',
                geo: { lat: 24.7000, lng: 46.7500 },
                inventory: [
                    { sku: 'AMOXIL-500', stock: 80, price: 24, name_ar: 'أموكسيل 500 ملغ', generic_name: 'Amoxicillin', dosage: '500mg', form: 'capsule' },
                    { sku: 'OMEPRA-20', stock: 60, price: 22, name_ar: 'أوميبرازول 20 ملغ', generic_name: 'Omeprazole', dosage: '20mg', form: 'capsule' },
                    { sku: 'VITC-1000', stock: 20, price: 28, name_ar: 'فيتامين سي 1000', generic_name: 'Ascorbic Acid', dosage: '1000mg', form: 'tablet' },
                ],
            },
        ];
        for (const p of pharmacies) {
            let acc = await this.accounts.findOne({ email: p.email });
            if (!acc) {
                const hash = await bcrypt.hash('Pharm@123456', 12);
                acc = await this.accounts.create({
                    id: (0, uuid_1.v4)(),
                    email: p.email,
                    phone_e164: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
                    password_hash: hash,
                    provider_type: provider_enums_1.ProviderType.PHARMACY,
                    email_verified: true,
                    status: provider_enums_1.ProviderAccountStatus.APPROVED,
                });
            }
            let prof = await this.profiles.findOne({ account_id: acc.id });
            if (!prof) {
                prof = await this.profiles.create({
                    id: (0, uuid_1.v4)(),
                    account_id: acc.id,
                    provider_type: provider_enums_1.ProviderType.PHARMACY,
                    business_name: p.business_name,
                    legal_name: p.business_name,
                    address: { country: 'SA', city: 'الرياض', district: p.district },
                    geo: { ...p.geo, service_radius_km: 15 },
                });
            }
            else {
                prof.business_name = p.business_name;
                prof.geo = { ...p.geo, service_radius_km: 15 };
                await prof.save();
            }
            await this.avails.findOneAndUpdate({ provider_account_id: acc.id }, { provider_account_id: acc.id, status: requests_schema_1.ProviderAvailabilityStatus.ACCEPTING_ORDERS, last_online_at: new Date() }, { upsert: true, setDefaultsOnInsert: true });
            for (const item of p.inventory) {
                await this.inv.findOneAndUpdate({ provider_account_id: acc.id, sku: item.sku }, { ...item, provider_account_id: acc.id, available: true, currency: 'SAR', min_stock_alert: 10 }, { upsert: true, setDefaultsOnInsert: true });
            }
            created.push({ email: p.email, account_id: acc.id, business_name: p.business_name, items: p.inventory.length });
        }
        return { ok: true, pharmacies: created };
    }
    async seedSampleOrder(patient_account_id) {
        this.assertTestSeedAllowed();
        const sample = await this.orders.create({
            id: (0, uuid_1.v4)(),
            patient_account_id,
            status: pharmacy_schema_1.PharmacyOrderState.DRAFT,
            items: [
                { id: (0, uuid_1.v4)(), raw_name: 'بانادول إكسترا', name_ar: 'بانادول إكسترا', matched_sku: 'PAN-EXT-500', generic_name: 'Paracetamol+Caffeine', qty: 2, match_status: pharmacy_schema_1.OrderItemMatchStatus.MANUAL, intake_source: 'manual' },
                { id: (0, uuid_1.v4)(), raw_name: 'أموكسيل 500', name_ar: 'أموكسيل 500 ملغ', matched_sku: 'AMOXIL-500', generic_name: 'Amoxicillin', qty: 1, match_status: pharmacy_schema_1.OrderItemMatchStatus.MANUAL, intake_source: 'manual' },
                { id: (0, uuid_1.v4)(), raw_name: 'فيتامين سي', name_ar: 'فيتامين سي 1000', matched_sku: 'VITC-1000', generic_name: 'Ascorbic Acid', qty: 1, match_status: pharmacy_schema_1.OrderItemMatchStatus.MANUAL, intake_source: 'manual' },
            ],
            delivery_address: { city: 'الرياض', district: 'العليا', geo: { lat: 24.7136, lng: 46.6753 } },
            timeline: [{ ts: new Date(), event: 'created_by_seed' }],
        });
        return sample.toObject();
    }
};
exports.PharmacySeedService = PharmacySeedService;
exports.PharmacySeedService = PharmacySeedService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PharmacyOrderRepository')),
    __param(1, (0, common_1.Inject)('PharmacyInventoryItemRepository')),
    __param(2, (0, common_1.Inject)('ProviderAccountRepository')),
    __param(3, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __param(4, (0, common_1.Inject)('ProviderAvailabilityRepository')),
    __metadata("design:paramtypes", [pharmacyorder_repository_1.PharmacyOrderRepository,
        pharmacyinventoryitem_repository_1.PharmacyInventoryItemRepository,
        provideraccount_repository_1.ProviderAccountRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository,
        provideravailability_repository_1.ProviderAvailabilityRepository])
], PharmacySeedService);
//# sourceMappingURL=pharmacy-seed.service.js.map