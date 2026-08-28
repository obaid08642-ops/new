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
exports.ProviderOnboardingModule = exports.UnifiedSearchController = exports.ProviderOnboardingController = exports.ProviderOnboardingService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const user_schema_1 = require("../../schemas/user.schema");
const event_bus_service_1 = require("../events/event-bus.service");
const contract_pdf_service_1 = require("./contract-pdf.service");
const bcrypt = __importStar(require("bcryptjs"));
const uuid_1 = require("uuid");
let ProviderOnboardingService = class ProviderOnboardingService {
    constructor(userModel, providerModel, bus, contracts) {
        this.userModel = userModel;
        this.providerModel = providerModel;
        this.bus = bus;
        this.contracts = contracts;
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
    async start(body) {
        if (!body.type || !Object.values(enums_1.ProviderType).includes(body.type))
            throw new common_1.BadRequestException('invalid_type');
        if (!body.phone)
            throw new common_1.BadRequestException('phone_required');
        if (!String(body.full_name || '').trim())
            throw new common_1.BadRequestException('full_name_required');
        if (!/^\S+@\S+\.\S+$/.test(String(body.email || '').trim()))
            throw new common_1.BadRequestException('verified_contact_email_required');
        let user = await this.userModel.findOne({ phone: body.phone });
        if (!user) {
            if (!body.password)
                throw new common_1.BadRequestException('password_required_for_new_user');
            const hash = await bcrypt.hash(body.password, 12);
            try {
                user = await this.userModel.create({
                    phone: body.phone, full_name: String(body.full_name).trim(),
                    email: String(body.email).trim().toLowerCase(), password_hash: hash,
                    role: enums_1.UserRole.GUEST, active: true, onboarding_only: true,
                });
            }
            catch (err) {
                if (err.code === 11000) {
                    throw new common_1.BadRequestException('البريد الإلكتروني أو رقم الجوال مسجل مسبقاً / Email or phone already registered');
                }
                throw err;
            }
        }
        let profile = await this.providerModel.findOne({ user_id: user.id });
        if (!profile) {
            profile = await this.providerModel.create({
                user_id: user.id, account_id: user.id, type: body.type, status: enums_1.ProviderStatus.PENDING,
                name_ar: String(body.full_name).trim(), onboarding_step: 1,
            });
        }
        else if (profile.type !== body.type) {
            profile.type = body.type;
            profile.onboarding_step = 1;
            await profile.save();
        }
        this.bus.emit({ type: 'onboarding.started', entity_type: 'provider', entity_id: profile.id, actor_account_id: user.id, actor_role: 'provider', meta: { type: body.type } }).catch(() => null);
        return { ok: true, user_id: user.id, profile_id: profile.id, type: profile.type, step: profile.onboarding_step };
    }
    snapshotStep(profile, step, body) {
        if (!body || typeof body !== 'object')
            return;
        const clean = {};
        for (const [k, v] of Object.entries(body)) {
            if (/pass|secret|token/i.test(k))
                continue;
            if (typeof v === 'string' && /^(file|content):\/\//.test(v))
                continue;
            clean[k] = v;
        }
        if (!Object.keys(clean).length)
            return;
        const steps = profile.registration_steps || {};
        const arr = Array.isArray(steps[step]) ? steps[step] : [];
        arr.push({ at: new Date(), data: clean });
        profile.registration_steps = { ...steps, [step]: arr.slice(-10) };
        profile.markModified?.('registration_steps');
    }
    async step2(user, body) {
        const profile = await this.providerModel.findOne({ user_id: user.id });
        if (!profile)
            throw new common_1.NotFoundException('profile_not_started');
        const fields = ['name_ar', 'name_en', 'city', 'district', 'address', 'location', 'license_number', 'license_documents', 'coverage_radius_km', 'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'bio', 'languages', 'iban', 'bank_account_name', 'pharmacy_type', 'cr_number', 'moh_license_number', 'sfda_license_number', 'tax_number',
            'clinic_images', 'scfhs_license_number', 'national_id', 'gender', 'clinic_name',
            'display_name_ar', 'display_name_en', 'profile_photo', 'logo'];
        for (const f of fields)
            if (body[f] !== undefined)
                profile[f] = body[f];
        this.snapshotStep(profile, 'step2', body);
        profile.onboarding_step = Math.max(profile.onboarding_step || 0, 2);
        await profile.save();
        return profile.toObject();
    }
    async step3(user, body) {
        const profile = await this.providerModel.findOne({ user_id: user.id });
        if (!profile)
            throw new common_1.NotFoundException('profile_not_started');
        const allowed = {
            [enums_1.ProviderType.DOCTOR]: [
                'specialty', 'sub_specialties', 'title', 'academic_degree', 'years_experience',
                'consultation_modes', 'price_clinic', 'price_online', 'price_home',
                'consultation_fee', 'online_consultation_fee', 'home_visit_fee',
                'hospital', 'working_hours', 'accepts_insurance', 'accepted_insurance',
                'insurance_clinic', 'insurance_online', 'insurance_home',
                'coverage_radius_km', 'home_visit_supported',
                'home_visit_radius_km', 'clinic_duration', 'video_duration',
                'home_transport_fee', 'home_transport_price', 'clinic_name', 'vacation_date',
                'schedule_video', 'schedule_home', 'schedule_clinic', 'national_id', 'gender',
                'languages', 'display_name_ar', 'display_name_en',
            ],
            [enums_1.ProviderType.HOSPITAL]: [
                'doctors_roster', 'lab_roster', 'radiology_roster', 'nursing_roster', 'ambulance_roster', 'working_hours',
                'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'schedule_home',
            ],
            [enums_1.ProviderType.CLINIC]: [
                'doctors_roster', 'lab_roster', 'radiology_roster', 'nursing_roster', 'ambulance_roster', 'working_hours',
                'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'schedule_home',
            ],
            [enums_1.ProviderType.LAB]: [
                'test_categories', 'home_visit_supported', 'home_visit_radius_km',
                'gender_pref', 'working_hours', 'accepts_insurance', 'accepted_insurance',
                'accepts_cash', 'nursing_services', 'consultation_modes', 'price_clinic', 'price_home',
                'schedule_home'
            ],
            [enums_1.ProviderType.RADIOLOGY]: [
                'equipment_list', 'home_visit_supported', 'working_hours',
                'accepts_insurance', 'accepted_insurance', 'accepts_cash', 'test_categories', 'consultation_modes', 'price_clinic', 'price_home',
                'radiation_safety_license', 'available_equipment_text', 'schedule_home'
            ],
            [enums_1.ProviderType.PHARMACY]: [
                'pharmacy_chain', 'has_own_drivers', 'delivery_radius_km',
                'has_own_delivery', 'working_hours', 'accepts_insurance', 'accepted_insurance',
                'accepts_cash', 'coverage_radius_km', 'delivery_fee', 'free_delivery_above',
                'min_order_sar', 'express_delivery', 'express_fee', 'express_minutes',
                'rx_dispensing', 'otc_selling', 'enabled_categories'
            ],
            [enums_1.ProviderType.HOME_CARE]: [
                'nursing_services', 'home_visit_radius_km', 'working_hours',
                'accepts_insurance', 'accepted_insurance', 'accepts_cash',
                'gender', 'pricingModel', 'priceVisit', 'priceHour', 'priceDay', 'priceMonth', 'schedule_home'
            ],
            [enums_1.ProviderType.AMBULANCE]: [
                'vehicles_count', 'vehicle_plates', 'equipment_list', 'paramedic_count',
                'coverage_radius_km', 'service_area_cities', 'working_hours',
                'accepts_insurance', 'accepted_insurance', 'accepts_cash',
                'emergency_level', 'has_icu_units', 'base_location'
            ],
            [enums_1.ProviderType.NURSING]: [
                'nursing_services', 'home_visit_radius_km', 'working_hours',
                'accepts_insurance', 'accepted_insurance', 'accepts_cash',
                'coverage_radius_km', 'home_visit_supported',
                'gender', 'pricingModel', 'priceVisit', 'priceHour', 'priceDay', 'priceMonth', 'schedule_home'
            ],
        };
        const keys = allowed[profile.type] || [];
        for (const k of keys)
            if (body[k] !== undefined)
                profile[k] = body[k];
        this.snapshotStep(profile, 'step3', body);
        profile.onboarding_step = Math.max(profile.onboarding_step || 0, 3);
        await profile.save();
        return profile.toObject();
    }
    async getMyProfile(user) {
        const profile = await this.providerModel.findOne({ user_id: user.id }).lean();
        if (!profile)
            throw new common_1.NotFoundException('profile_not_found');
        return profile;
    }
    async submit(user, body) {
        const profile = await this.providerModel.findOne({ user_id: user.id });
        if (!profile)
            throw new common_1.NotFoundException();
        if ((profile.onboarding_step || 0) < 3)
            throw new common_1.BadRequestException('complete_all_steps_first');
        profile.onboarding_completed = true;
        profile.status = enums_1.ProviderStatus.PENDING;
        if (body) {
            if (body.signer_name)
                profile.signer_name = body.signer_name;
            if (body.signer_role)
                profile.signer_role = body.signer_role;
            if (body.signature_url)
                profile.signature_url = body.signature_url;
            if (body.lat && body.lng && !profile.location?.lat) {
                profile.location = { lat: Number(body.lat), lng: Number(body.lng) };
            }
            if (body.full_data && typeof body.full_data === 'object')
                this.snapshotStep(profile, 'full_data', body.full_data);
            this.snapshotStep(profile, 'submit', { signer_name: body.signer_name, signer_role: body.signer_role, lat: body.lat, lng: body.lng });
        }
        await profile.save();
        await this.mirrorToModerationQueue(user, profile);
        await this.generateAndStoreContract(user, profile);
        this.bus.emit({ type: 'provider.submitted_for_review', entity_type: 'provider', entity_id: profile.id, actor_account_id: user.id, actor_role: 'provider', meta: { type: profile.type } }).catch(() => null);
        return profile.toObject();
    }
    async generateAndStoreContract(user, profile) {
        const fullUser = await this.userModel.findOne({ id: user.id }).lean();
        const { pdf, sha256 } = await this.contracts.generate({
            profileId: profile.id,
            accountId: profile.account_id || null,
            userId: user.id,
            providerType: profile.type,
            nameAr: profile.name_ar,
            nameEn: profile.name_en,
            licenseNumber: profile.license_number || profile.moh_license_number || profile.scfhs_license_number || profile.sfda_license_number,
            crNumber: profile.cr_number,
            city: profile.city,
            signerName: profile.signer_name,
            signerRole: profile.signer_role,
            signatureUrl: profile.signature_url,
            email: fullUser?.email,
            phone: fullUser?.phone,
        });
        const now = new Date();
        await this.providerModel.db.collection('provider_contracts').updateOne({ profile_id: profile.id }, {
            $set: {
                account_id: profile.account_id || null,
                user_id: user.id,
                provider_type: profile.type,
                signer_name: profile.signer_name || null,
                signer_role: profile.signer_role || null,
                signature_url: profile.signature_url || null,
                pdf_base64: pdf.toString('base64'),
                sha256,
                updatedAt: now,
            },
            $setOnInsert: { id: (0, uuid_1.v4)(), visible_to_provider: true, createdAt: now },
        }, { upsert: true });
    }
    async ensureContract(profile) {
        const col = this.providerModel.db.collection('provider_contracts');
        const existing = await col.findOne({ profile_id: profile.id });
        if (existing)
            return existing;
        const user = { id: profile.user_id };
        await this.generateAndStoreContract(user, profile);
        return col.findOne({ profile_id: profile.id });
    }
    async getContractForOwner(user) {
        let c = await this.providerModel.db.collection('provider_contracts').findOne({ user_id: user.id });
        if (!c) {
            const profile = await this.providerModel.findOne({ user_id: user.id }).lean();
            if (!profile)
                throw new common_1.NotFoundException('contract_not_generated');
            c = await this.ensureContract(profile);
        }
        if (!c)
            throw new common_1.NotFoundException('contract_not_generated');
        if (!c.visible_to_provider)
            throw new common_1.ForbiddenException('contract_not_shared_by_admin');
        return c;
    }
    async getContractForAdmin(accountOrProfileId) {
        const col = this.providerModel.db.collection('provider_contracts');
        let c = await col.findOne({ $or: [{ account_id: accountOrProfileId }, { profile_id: accountOrProfileId }] });
        if (!c) {
            const profile = await this.providerModel.findOne({ $or: [{ account_id: accountOrProfileId }, { id: accountOrProfileId }] }).lean();
            if (!profile)
                throw new common_1.NotFoundException('contract_not_generated');
            c = await this.ensureContract(profile);
        }
        if (!c)
            throw new common_1.NotFoundException('contract_not_generated');
        return c;
    }
    async setContractVisibility(accountOrProfileId, visible) {
        const col = this.providerModel.db.collection('provider_contracts');
        const res = await col.updateOne({ $or: [{ account_id: accountOrProfileId }, { profile_id: accountOrProfileId }] }, { $set: { visible_to_provider: visible, updatedAt: new Date() } });
        if (!res.matchedCount)
            throw new common_1.NotFoundException('contract_not_generated');
        return { ok: true, visible_to_provider: visible };
    }
    async mirrorToModerationQueue(user, profile) {
        const fullUser = await this.userModel.findOne({ id: user.id }).lean();
        const email = (fullUser?.email || '').toLowerCase().trim();
        if (!email)
            return;
        const accounts = this.providerModel.db.collection('provider_accounts');
        const typeMap = { lab: 'laboratory' };
        const ptype = typeMap[profile.type] || profile.type;
        const now = new Date();
        const existing = await accounts.findOne({ email });
        const onboardingMeta = {
            source: 'provider_onboarding',
            profile_id: profile.id,
            signature_url: profile.signature_url || null,
            signer_name: profile.signer_name || null,
            signer_role: profile.signer_role || null,
            submitted_at: now,
        };
        if (!existing) {
            const accountId = (0, uuid_1.v4)();
            await accounts.insertOne({
                id: accountId,
                email,
                phone_e164: fullUser?.phone,
                password_hash: fullUser?.password_hash || 'onboarding',
                provider_type: ptype,
                status: 'pending_admin_approval',
                email_verified: true,
                email_verified_at: now,
                failed_login_attempts: 0,
                status_history: [{ from: null, to: 'pending_admin_approval', by_user_id: user.id, by_role: 'provider', at: now, note: 'onboarding submitted' }],
                onboarding_progress: onboardingMeta,
                createdAt: now,
                updatedAt: now,
            });
            profile.account_id = accountId;
        }
        else {
            const current = existing.status;
            if (current !== 'approved' && current !== 'suspended') {
                await accounts.updateOne({ id: existing.id }, {
                    $set: {
                        provider_type: ptype,
                        status: 'pending_admin_approval',
                        email_verified: true,
                        onboarding_progress: onboardingMeta,
                        updatedAt: now,
                    },
                    $push: { status_history: { from: current, to: 'pending_admin_approval', by_user_id: user.id, by_role: 'provider', at: now, note: 'onboarding resubmitted' } },
                });
            }
            else {
                await accounts.updateOne({ id: existing.id }, { $set: { onboarding_progress: onboardingMeta, updatedAt: now } });
            }
            profile.account_id = existing.id;
        }
        await profile.save();
    }
    async getProgress(user) {
        const profile = await this.providerModel.findOne({ user_id: user.id }, { _id: 0, __v: 0 });
        if (!profile)
            return { started: false };
        return { started: true, ...profile.toObject() };
    }
    async unifiedSearch(q) {
        const filter = { status: enums_1.ProviderStatus.ACTIVE };
        if (q.type)
            filter.type = q.type;
        if (q.city)
            filter.city = q.city;
        if (q.home_visit === true)
            filter.home_visit_supported = true;
        if (q.insurance)
            filter.accepted_insurance = q.insurance;
        if (q.service) {
            const re = new RegExp(q.service, 'i');
            filter.$or = [
                { name_ar: re },
                { name_en: re },
                { specialty: re },
                { sub_specialties: re },
                { test_categories: re },
                { equipment_list: re },
                { 'doctors_roster.specialty': re },
                { 'doctors_roster.name': re },
                { 'nursing_services.name_ar': re },
                { 'nursing_services.name_en': re },
            ];
        }
        const list = await this.providerModel.find(filter, { _id: 0, __v: 0, license_documents: 0 }).sort({ rating: -1 }).limit(80).lean();
        return list.map((p) => ({
            ...p,
            matched_capabilities: this.summarizeCaps(p, q.service),
        }));
    }
    summarizeCaps(p, query) {
        const out = [];
        const test = (s) => !query || (s && s.toLowerCase().includes(query.toLowerCase()));
        if (p.specialty && test(p.specialty))
            out.push(`specialty:${p.specialty}`);
        for (const cat of p.test_categories || [])
            if (test(cat))
                out.push(`test:${cat}`);
        for (const eq of p.equipment_list || [])
            if (test(eq))
                out.push(`equipment:${eq}`);
        for (const d of p.doctors_roster || [])
            if (test(d.name) || test(d.specialty))
                out.push(`doctor:${d.name}`);
        for (const ns of p.nursing_services || [])
            if (test(ns.name_ar) || test(ns.name_en))
                out.push(`nursing:${ns.name_ar}`);
        return out;
    }
};
exports.ProviderOnboardingService = ProviderOnboardingService;
exports.ProviderOnboardingService = ProviderOnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('User')),
    __param(1, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        event_bus_service_1.EventBusService,
        contract_pdf_service_1.ContractPdfService])
], ProviderOnboardingService);
let ProviderOnboardingController = class ProviderOnboardingController {
    constructor(svc) {
        this.svc = svc;
    }
    start(b) { return this.svc.start(b); }
    myProfile(u) { return this.svc.getMyProfile(u); }
    step2(u, b) { return this.svc.step2(u, b); }
    step3(u, b) { return this.svc.step3(u, b); }
    submit(u, b) { return this.svc.submit(u, b); }
    progress(u) { return this.svc.getProgress(u); }
    async myContract(u) {
        const c = await this.svc.getContractForOwner(u);
        return { pdf_base64: c.pdf_base64, sha256: c.sha256, generated_at: c.createdAt };
    }
    async adminContract(u, id) {
        if (u.role !== 'admin' && u.role !== 'super_admin')
            throw new common_1.ForbiddenException('admin only');
        const c = await this.svc.getContractForAdmin(id);
        return { pdf_base64: c.pdf_base64, sha256: c.sha256, visible_to_provider: c.visible_to_provider, generated_at: c.createdAt, signer_name: c.signer_name, signer_role: c.signer_role };
    }
    async adminContractVisibility(u, id, b) {
        if (u.role !== 'admin' && u.role !== 'super_admin')
            throw new common_1.ForbiddenException('admin only');
        return this.svc.setContractVisibility(id, !!b?.visible);
    }
};
exports.ProviderOnboardingController = ProviderOnboardingController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderOnboardingController.prototype, "start", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('my-profile'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderOnboardingController.prototype, "myProfile", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('step2'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderOnboardingController.prototype, "step2", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('step3'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderOnboardingController.prototype, "step3", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('submit'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderOnboardingController.prototype, "submit", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('progress'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderOnboardingController.prototype, "progress", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('contract'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderOnboardingController.prototype, "myContract", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/contracts/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProviderOnboardingController.prototype, "adminContract", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('admin/contracts/:id/visibility'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProviderOnboardingController.prototype, "adminContractVisibility", null);
exports.ProviderOnboardingController = ProviderOnboardingController = __decorate([
    (0, common_1.Controller)('provider-onboarding'),
    __metadata("design:paramtypes", [ProviderOnboardingService])
], ProviderOnboardingController);
let UnifiedSearchController = class UnifiedSearchController {
    constructor(svc) {
        this.svc = svc;
    }
    search(q) {
        return this.svc.unifiedSearch({
            service: q.service || q.q,
            type: q.type,
            city: q.city,
            home_visit: q.home_visit === 'true' || q.home_visit === '1',
            insurance: q.insurance,
        });
    }
};
exports.UnifiedSearchController = UnifiedSearchController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('providers'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UnifiedSearchController.prototype, "search", null);
exports.UnifiedSearchController = UnifiedSearchController = __decorate([
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [ProviderOnboardingService])
], UnifiedSearchController);
let ProviderOnboardingModule = class ProviderOnboardingModule {
};
exports.ProviderOnboardingModule = ProviderOnboardingModule;
exports.ProviderOnboardingModule = ProviderOnboardingModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
            ])],
        controllers: [ProviderOnboardingController, UnifiedSearchController],
        providers: [ProviderOnboardingService, contract_pdf_service_1.ContractPdfService],
        exports: [ProviderOnboardingService],
    })
], ProviderOnboardingModule);
//# sourceMappingURL=provider-onboarding.module.js.map