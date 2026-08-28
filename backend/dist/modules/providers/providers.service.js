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
exports.ProvidersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const bcrypt = __importStar(require("bcryptjs"));
const provider_branch_schema_1 = require("../../schemas/provider-branch.schema");
const enums_1 = require("../../common/enums");
const events_1 = require("../../common/events");
const user_repository_1 = require("./repositories/user.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const mongoose_2 = require("@nestjs/mongoose");
const catalog_publication_service_1 = require("../events/catalog-publication.service");
let ProvidersService = class ProvidersService {
    constructor(userModel, providerModel, branchModel, events, publication) {
        this.userModel = userModel;
        this.providerModel = providerModel;
        this.branchModel = branchModel;
        this.events = events;
        this.publication = publication;
    }
    async refreshPublicProjection(provider, actorId, reason) {
        const reviewedAt = provider?.last_reviewed || provider?.approved_at || provider?.updatedAt || new Date();
        return this.publication.refresh({
            entityType: 'provider',
            entityId: provider.id,
            actorId,
            actorRole: 'admin',
            reason,
            idempotencyKey: `catalog-publication:provider:${provider.id}:${reason}:${new Date(reviewedAt).toISOString()}`,
        });
    }
    async createBranchStaffAccount(adminId, branchId, staffDto) {
        const admin = await this.userModel.findOne({ id: adminId });
        if (!admin)
            throw new common_1.NotFoundException('Admin not found');
        if (![enums_1.UserRole.HOSPITAL_ADMIN, enums_1.UserRole.BRANCH_ADMIN].includes(admin.role)) {
            throw new common_1.ForbiddenException('صلاحية مرفوضة. فقط إدارة المستشفى تملك حق تعيين الموظفين الفرعيين.');
        }
        const branch = await this.branchModel.findById(branchId);
        if (!branch)
            throw new common_1.NotFoundException('الفرع المحدد غير موجود بالمنظومة.');
        const hash = await bcrypt.hash(staffDto.password || 'Temp123!', 12);
        const staffUser = await this.userModel.create({
            full_name: staffDto.fullName,
            email: staffDto.email,
            phone: staffDto.phone,
            password_hash: hash,
            role: staffDto.role,
            parent_provider_account_id: admin.parent_provider_account_id,
            assigned_branch_id: branch._id,
            active: true
        });
        if (staffDto.role === enums_1.UserRole.DOCTOR) {
            await this.providerModel.create({
                user_id: staffUser.id,
                type: enums_1.ProviderType.DOCTOR,
                status: enums_1.ProviderStatus.ACTIVE,
                license_verified: true,
                name_ar: staffDto.fullNameAr || staffDto.fullName,
                name_en: staffDto.fullNameEn || staffDto.fullName,
                specialty: staffDto.specialty,
                years_experience: staffDto.years_experience || 0,
                price_clinic: staffDto.priceClinic || 100,
                price_online: staffDto.priceOnline || 100,
                approved_at: new Date()
            });
            branch.doctors_roster.push(staffUser.id);
            await branch.save();
        }
        return { success: true, message: 'تم إنشاء الحساب الفرعي وتفعيله تلقائياً تحت مظلة ترخيص المستشفى.' };
    }
    async apply(data) {
        const exists = await this.userModel.findOne({ phone: data.phone });
        if (exists)
            throw new common_1.ConflictException('Phone already registered');
        const hash = await bcrypt.hash(data.password, 12);
        const role = this.typeToRole(data.type);
        const user = await this.userModel.create({
            full_name: data.full_name,
            phone: data.phone,
            email: data.email,
            password_hash: hash,
            role,
            active: false,
        });
        const profile = await this.providerModel.create({
            user_id: user.id,
            type: data.type,
            status: enums_1.ProviderStatus.PENDING,
            name_ar: data.name_ar,
            name_en: data.name_en,
            license_number: data.license_number,
            city: data.city,
            district: data.district,
            specialty: data.specialty,
            years_experience: data.years_experience,
            consultation_modes: data.consultation_modes || [],
            price_clinic: data.price_clinic,
            price_online: data.price_online,
            pharmacy_chain: data.pharmacy_chain,
            has_own_drivers: !!data.has_own_drivers,
        });
        this.events.emit(events_1.EVENTS.USER_REGISTERED, { user_id: user.id, role });
        this.events.emit('provider.pending_review', { provider_id: profile.id, type: data.type });
        return { ok: true, user: this.publicUser(user), profile: profile.toObject() };
    }
    async adminCreate(data, _admin) {
        const exists = await this.userModel.findOne({ phone: data.phone });
        if (exists)
            throw new common_1.ConflictException('Phone already registered');
        const password = data.password || `Temp@${Math.floor(Math.random() * 10000)}`;
        const hash = await bcrypt.hash(password, 12);
        const role = this.typeToRole(data.type);
        const status = data.auto_approve ? enums_1.ProviderStatus.ACTIVE : enums_1.ProviderStatus.PENDING;
        const user = await this.userModel.create({
            full_name: data.full_name,
            phone: data.phone,
            email: data.email,
            password_hash: hash,
            role,
            active: status === enums_1.ProviderStatus.ACTIVE,
        });
        const profile = await this.providerModel.create({
            user_id: user.id,
            type: data.type,
            status,
            name_ar: data.name_ar,
            name_en: data.name_en,
            license_number: data.license_number,
            license_verified: !!data.auto_approve,
            city: data.city,
            district: data.district,
            location: data.location,
            specialty: data.specialty,
            years_experience: data.years_experience,
            consultation_modes: data.consultation_modes || [],
            price_clinic: data.price_clinic,
            price_online: data.price_online,
            price_home: data.price_home,
            pharmacy_chain: data.pharmacy_chain,
            has_own_drivers: !!data.has_own_drivers,
            working_hours: data.working_hours || [],
            approved_at: data.auto_approve ? new Date() : undefined,
        });
        this.events.emit(events_1.EVENTS.USER_REGISTERED, { user_id: user.id, role });
        if (status === enums_1.ProviderStatus.PENDING) {
            this.events.emit('provider.pending_review', { provider_id: profile.id, type: data.type });
        }
        else {
            this.events.emit('provider.approved', { provider_id: profile.id });
        }
        return { ok: true, user: this.publicUser(user), profile: profile.toObject(), generated_password: data.password ? undefined : password };
    }
    async approve(id, admin) {
        const p = await this.providerModel.findOne({ id });
        if (!p)
            throw new common_1.NotFoundException();
        p.status = enums_1.ProviderStatus.ACTIVE;
        p.approved_at = new Date();
        p.approved_by = admin.id;
        p.license_verified = true;
        p.public_eligibility = true;
        p.indexing_eligibility = false;
        p.medical_review_status = 'approved';
        p.last_reviewed = p.approved_at;
        p.provenance = 'admin_provider_review';
        await p.save();
        await this.userModel.updateOne({ id: p.user_id }, { $set: { active: true } });
        this.events.emit('provider.approved', { provider_id: p.id });
        await this.refreshPublicProjection(p, admin.id, 'provider_approved');
        return p.toObject();
    }
    async reject(id, admin, reason) {
        const p = await this.providerModel.findOne({ id });
        if (!p)
            throw new common_1.NotFoundException();
        p.status = enums_1.ProviderStatus.REJECTED;
        p.rejected_reason = reason;
        p.public_eligibility = false;
        p.indexing_eligibility = false;
        p.medical_review_status = 'rejected';
        p.last_reviewed = new Date();
        p.provenance = 'admin_provider_review';
        await p.save();
        await this.userModel.updateOne({ id: p.user_id }, { $set: { active: false } });
        this.events.emit('provider.rejected', { provider_id: p.id, reason });
        await this.refreshPublicProjection(p, admin.id, 'provider_rejected');
        return p.toObject();
    }
    async suspend(id, admin, reason) {
        const p = await this.providerModel.findOne({ id });
        if (!p)
            throw new common_1.NotFoundException();
        p.status = enums_1.ProviderStatus.SUSPENDED;
        p.rejected_reason = reason;
        p.public_eligibility = false;
        p.indexing_eligibility = false;
        p.medical_review_status = 'suspended';
        p.last_reviewed = new Date();
        p.provenance = 'admin_provider_review';
        await p.save();
        await this.userModel.updateOne({ id: p.user_id }, { $set: { active: false } });
        this.events.emit('provider.suspended', { provider_id: p.id });
        await this.refreshPublicProjection(p, admin.id, 'provider_suspended');
        return p.toObject();
    }
    async listPending() {
        return this.providerModel.find({ status: enums_1.ProviderStatus.PENDING }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
    }
    async listAll(type, status, search) {
        const q = {};
        if (type)
            q.type = type;
        if (status)
            q.status = status;
        if (search)
            q.$or = [{ name_ar: { $regex: search, $options: 'i' } }, { name_en: { $regex: search, $options: 'i' } }];
        return this.providerModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(500);
    }
    publicDiscoveryFilter() {
        return {
            status: enums_1.ProviderStatus.ACTIVE,
            public_eligibility: true,
            medical_review_status: 'approved',
        };
    }
    async listPublic(type, city, insurance_company, insurance_network, insurance_class) {
        const q = this.publicDiscoveryFilter();
        if (type)
            q.type = type;
        if (city)
            q.city = city;
        if (insurance_company || insurance_network || insurance_class) {
            const elemMatch = {};
            if (insurance_company) {
                elemMatch.$or = [
                    { company_id: insurance_company },
                    { company_name_en: { $regex: new RegExp(insurance_company, 'i') } },
                    { company_name_ar: { $regex: new RegExp(insurance_company, 'i') } }
                ];
            }
            if (insurance_network) {
                const netOr = [
                    { network_id: insurance_network },
                    { network_name_en: { $regex: new RegExp(insurance_network, 'i') } },
                    { network_name_ar: { $regex: new RegExp(insurance_network, 'i') } }
                ];
                if (elemMatch.$or) {
                    elemMatch.$and = [
                        { $or: elemMatch.$or },
                        { $or: netOr }
                    ];
                    delete elemMatch.$or;
                }
                else {
                    elemMatch.$or = netOr;
                }
            }
            if (insurance_class) {
                const cleanClass = insurance_class.replace(/class\s+/i, '').toUpperCase();
                elemMatch.covered_classes = {
                    $in: [
                        insurance_class,
                        cleanClass,
                        `Class ${cleanClass}`,
                        `class ${cleanClass}`,
                        insurance_class.toUpperCase(),
                        insurance_class.toLowerCase()
                    ]
                };
            }
            q.insurance_contracts = { $elemMatch: elemMatch };
        }
        return this.providerModel.find(q, { _id: 0, __v: 0 }).sort({ rating: -1, createdAt: -1 }).limit(200);
    }
    async mapProviders(type, lat, lng, radiusKm) {
        const q = { ...this.publicDiscoveryFilter(), 'location.lat': { $exists: true, $ne: null }, 'location.lng': { $exists: true, $ne: null } };
        if (type)
            q.type = type;
        const rows = await this.providerModel.find(q, { _id: 0, __v: 0, password_hash: 0 }).limit(300);
        const hav = (la1, ln1, la2, ln2) => {
            const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLn = (ln2 - ln1) * Math.PI / 180;
            const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLn / 2) ** 2;
            return 2 * R * Math.asin(Math.sqrt(a));
        };
        let out = rows.map((r) => {
            const o = r.toObject ? r.toObject() : r;
            const loc = o.location || {};
            const item = {
                id: o.id || o.user_id, type: o.type, name_ar: o.name_ar, name_en: o.name_en,
                city: o.city, district: o.district, rating: o.rating ?? null,
                lat: loc.lat, lng: loc.lng,
                distance_km: (lat != null && lng != null && isFinite(lat) && isFinite(lng))
                    ? Math.round(hav(lat, lng, loc.lat, loc.lng) * 10) / 10 : null,
            };
            return item;
        });
        if (radiusKm && lat != null && lng != null)
            out = out.filter((x) => x.distance_km != null && x.distance_km <= radiusKm);
        if (lat != null && lng != null)
            out.sort((a, b) => (a.distance_km ?? 9e9) - (b.distance_km ?? 9e9));
        return out;
    }
    async getById(id) {
        const p = await this.providerModel.findOne({ id }, { _id: 0, __v: 0 });
        if (!p)
            throw new common_1.NotFoundException();
        return p;
    }
    async getPublicById(id) {
        const p = await this.providerModel.findOne({ id, ...this.publicDiscoveryFilter() }, { _id: 0, __v: 0 });
        if (!p)
            throw new common_1.NotFoundException();
        return p;
    }
    async myProfile(actor) {
        const identifiers = [
            actor?.id,
            actor?.account_id,
            actor?.provider_id,
            actor?.provider_profile_id,
        ].filter((value) => typeof value === 'string' && value.length > 0);
        if (identifiers.length === 0)
            throw new common_1.NotFoundException();
        const profile = await this.providerModel.findOne({ $or: [{ user_id: { $in: identifiers } }, { id: { $in: identifiers } }, { account_id: { $in: identifiers } }] }, { _id: 0, __v: 0 });
        if (!profile)
            throw new common_1.NotFoundException();
        return profile;
    }
    typeToRole(type) {
        return {
            [enums_1.ProviderType.DOCTOR]: enums_1.UserRole.DOCTOR,
            [enums_1.ProviderType.PHARMACY]: enums_1.UserRole.PHARMACY,
            [enums_1.ProviderType.HOSPITAL]: enums_1.UserRole.HOSPITAL,
            [enums_1.ProviderType.CLINIC]: enums_1.UserRole.HOSPITAL,
            [enums_1.ProviderType.LAB]: enums_1.UserRole.LAB,
            [enums_1.ProviderType.RADIOLOGY]: enums_1.UserRole.RADIOLOGY,
            [enums_1.ProviderType.HOME_CARE]: enums_1.UserRole.HOME_CARE,
            [enums_1.ProviderType.NURSING]: enums_1.UserRole.NURSING,
            [enums_1.ProviderType.AMBULANCE]: enums_1.UserRole.AMBULANCE,
        }[type];
    }
    publicUser(u) {
        const o = u.toObject ? u.toObject() : u;
        delete o.password_hash;
        delete o._id;
        delete o.__v;
        return o;
    }
    async seedDemoProviders() {
        const inserted = [];
        const skipped = [];
        const cities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة'];
        const insurances = ['Bupa', 'Tawuniya', 'MedGulf', 'AlRajhi', 'SAICO'];
        const sets = {
            lab: [['مختبر الرياض الطبي', 'Riyadh Medical Lab'], ['مختبر الفيصل', 'Al Faisal Lab'], ['البرج الذهبي', 'Golden Tower Lab'], ['الياسمين الطبي', 'Yasmin Medical Lab'], ['الرعاية المتقدمة', 'Advanced Care Lab']],
            radiology: [['مركز الأشعة المتقدم', 'Advanced Imaging'], ['الرياض للأشعة', 'Riyadh Imaging Center'], ['شعاع الطبي', 'Shoaa Medical Imaging'], ['الفجر للأشعة', 'Al Fajr Imaging'], ['الصفوة الطبية', 'Al Safwa Medical']],
            home_care: [['تمريض المنزل', 'Home Nursing SA'], ['الرعاية المنزلية', 'Care At Home'], ['تمريض راحة', 'Comfort Nursing']],
            hospital: [['مستشفى الأمل', 'Al Amal Hospital'], ['الحياة الطبي', 'Al Hayat Medical'], ['الشفاء الجامعي', 'Shifaa University']],
        };
        for (const type of Object.keys(sets)) {
            for (let i = 0; i < sets[type].length; i++) {
                const [name_ar, name_en] = sets[type][i];
                const exists = await this.providerModel.findOne({ name_ar, type });
                if (exists) {
                    skipped.push({ type, name_ar });
                    continue;
                }
                const doc = await this.providerModel.create({
                    user_id: `system-seed-${type}-${i}`,
                    type: type,
                    status: enums_1.ProviderStatus.ACTIVE,
                    name_ar, name_en,
                    license_number: `LIC-${type.toUpperCase()}-${1000 + i}`,
                    license_verified: true,
                    city: cities[i % cities.length], district: `حي ${cities[i % cities.length]}`,
                    location: { lat: 24.7 + Math.random() * 0.5, lng: 46.6 + Math.random() * 0.5 },
                    rating: 4.2 + Math.random() * 0.7,
                    reviews_count: 30 + Math.floor(Math.random() * 250),
                    coverage_radius_km: 15,
                    home_visit_supported: i % 2 === 0,
                    home_visit_radius_km: 20,
                    accepts_cash: true,
                    accepts_insurance: true,
                    accepted_insurance: insurances.slice(0, 2 + (i % 3)),
                    test_categories: type === 'lab' ? ['hematology', 'chemistry', 'immunology', 'microbiology'] : type === 'radiology' ? ['xray', 'ultrasound', 'mri', 'ct'] : [],
                    equipment_list: type === 'radiology' ? ['MRI 1.5T', 'CT Scan', 'Ultrasound', 'X-Ray'] : [],
                    working_hours: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'].map((day) => ({ day, open: '08:00', close: '22:00', closed: false })).concat([{ day: 'friday', open: '14:00', close: '22:00', closed: false }]),
                    onboarding_completed: true,
                    approved_at: new Date(),
                    approved_by: 'system-seed',
                });
                inserted.push({ id: doc.id, type, name_ar });
            }
        }
    }
    async updateProviderConfig(providerId, payload) {
        const provider = await this.providerModel.findOne({ id: providerId });
        if (!provider)
            throw new common_1.NotFoundException('Provider not found');
        const editable = new Set([
            'name_ar', 'name_en', 'phone', 'email', 'avatar', 'specialty', 'city',
            'district', 'location', 'about_ar', 'about_en', 'working_hours',
            'home_visit_supported', 'home_visit_radius_km', 'coverage_radius_km',
            'accepts_cash', 'accepts_insurance', 'accepted_insurance',
            'consultation_fee', 'languages', 'services',
        ]);
        const patch = Object.fromEntries(Object.entries(payload || {}).filter(([key, value]) => editable.has(key) && value !== undefined));
        if (!Object.keys(patch).length)
            throw new common_1.BadRequestException('No editable provider configuration fields supplied');
        const requiresReapproval = provider.public_eligibility === true
            || provider.indexing_eligibility === true
            || provider.medical_review_status === 'approved';
        const governanceReset = requiresReapproval ? {
            public_eligibility: false,
            indexing_eligibility: false,
            medical_review_status: 'pending',
            last_reviewed: null,
            provenance: 'provider_config_edit_pending_review',
        } : {};
        const updated = await this.providerModel.findOneAndUpdate({ id: providerId }, { $set: { ...patch, ...governanceReset, updatedAt: new Date() } }, { new: true });
        if (requiresReapproval) {
            await this.refreshPublicProjection(updated || { ...provider, ...patch, ...governanceReset }, provider.user_id || provider.id, 'provider_config_edit_reapproval');
        }
        return updated;
    }
};
exports.ProvidersService = ProvidersService;
exports.ProvidersService = ProvidersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('UserRepository')),
    __param(1, (0, common_1.Inject)('ProviderProfileRepository')),
    __param(2, (0, mongoose_2.InjectModel)(provider_branch_schema_1.ProviderBranch.name)),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        providerprofile_repository_1.ProviderProfileRepository,
        mongoose_1.Model,
        event_emitter_1.EventEmitter2,
        catalog_publication_service_1.CatalogPublicationService])
], ProvidersService);
//# sourceMappingURL=providers.service.js.map