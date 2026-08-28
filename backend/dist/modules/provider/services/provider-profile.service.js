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
exports.ProviderProfileService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
const schemas_1 = require("../schemas");
const provider_enums_1 = require("../provider.enums");
const storage_module_1 = require("../../storage/storage.module");
const provideraccount_repository_1 = require("./repositories/provideraccount.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const providerdocument_repository_1 = require("./repositories/providerdocument.repository");
const providerbankaccount_repository_1 = require("./repositories/providerbankaccount.repository");
const providerauditlog_repository_1 = require("./repositories/providerauditlog.repository");
function validateIban(iban) {
    if (!iban)
        return false;
    const clean = iban.replace(/\s+/g, '').toUpperCase();
    if (!/^SA\d{22}$/.test(clean))
        return false;
    return clean;
}
let ProviderProfileService = class ProviderProfileService {
    constructor(accounts, profiles, docs, banks, audit, connection, storage) {
        this.accounts = accounts;
        this.profiles = profiles;
        this.docs = docs;
        this.banks = banks;
        this.audit = audit;
        this.connection = connection;
        this.storage = storage;
    }
    async getProfile(user) {
        const p = await this.profiles.findOne({ account_id: user.id }, { _id: 0, __v: 0 });
        if (!p)
            throw new common_1.NotFoundException();
        return p;
    }
    async updateProfile(user, patch) {
        const allowed = ['display_name_ar', 'display_name_en', 'legal_name', 'description_ar', 'description_en', 'commercial_registration_number', 'tax_number', 'medical_license_number', 'facility_license_number', 'established_year', 'years_of_experience', 'website', 'social', 'address', 'geo', 'has_own_delivery', 'use_platform_delivery', 'delivery_fee', 'estimated_delivery_minutes', 'profile_image_id', 'cover_image_id', 'public_eligibility', 'enabled_modules', 'delivery_mode', 'max_delivery_radius_km', 'estimated_delivery_time', 'sub_specialties'];
        const set = {};
        for (const k of allowed)
            if (patch[k] !== undefined)
                set[k] = patch[k];
        if (set.enabled_modules) {
            const p = await this.profiles.findOne({ account_id: user.id });
            if (p && p.provider_type !== provider_enums_1.ProviderType.HOSPITAL && p.provider_type !== provider_enums_1.ProviderType.CLINIC)
                throw new common_1.BadRequestException('enabled_modules only allowed for hospitals/clinics');
            set.enabled_modules = set.enabled_modules.filter((m) => provider_enums_1.HOSPITAL_SUB_MODULES.includes(m));
        }
        const updated = await this.profiles.findOneAndUpdate({ account_id: user.id }, { $set: set }, { new: true });
        if (!updated)
            throw new common_1.NotFoundException();
        updated.profile_completeness = this.computeCompleteness(updated);
        await updated.save();
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'profile.update', after: set });
        return updated;
    }
    computeCompleteness(p) {
        const checks = [!!p.display_name_ar, !!p.display_name_en, !!p.description_ar, !!(p.phones && p.phones.length), !!p.address?.city, !!p.geo?.lat, !!p.commercial_registration_number || !!p.medical_license_number];
        const pct = (checks.filter(Boolean).length / checks.length) * 100;
        return Math.round(pct);
    }
    async addPhone(user, phone) {
        if (!phone?.number || !phone?.type)
            throw new common_1.BadRequestException('type and number required');
        if (!['mobile', 'whatsapp', 'landline', 'emergency'].includes(phone.type))
            throw new common_1.BadRequestException('invalid phone.type');
        const p = await this.profiles.findOne({ account_id: user.id });
        if (!p)
            throw new common_1.NotFoundException();
        if ((p.phones || []).length >= 5)
            throw new common_1.BadRequestException('max 5 phones per provider');
        const id = require('uuid').v4();
        const isPrimary = !(p.phones || []).length || !!phone.is_primary;
        if (isPrimary)
            for (const ph of (p.phones || []))
                ph.is_primary = false;
        p.phones.push({ id, type: phone.type, country_code: phone.country_code || '+966', number: phone.number, is_primary: isPrimary, verified: false });
        await p.save();
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'profile.phone_added', after: { id, type: phone.type } });
        return p;
    }
    async removePhone(user, phone_id) {
        const p = await this.profiles.findOne({ account_id: user.id });
        if (!p)
            throw new common_1.NotFoundException();
        const before = (p.phones || []).length;
        p.phones = (p.phones || []).filter((x) => x.id !== phone_id);
        if (p.phones.length === before)
            throw new common_1.NotFoundException('phone');
        if (p.phones.length && !p.phones.some((x) => x.is_primary))
            p.phones[0].is_primary = true;
        await p.save();
        return p;
    }
    async uploadDocument(user, body) {
        if (!body?.doc_type || !Object.values(provider_enums_1.ProviderDocumentType).includes(body.doc_type))
            throw new common_1.BadRequestException('invalid doc_type');
        if (!body?.file?.data_base64 || !body?.file?.mime)
            throw new common_1.BadRequestException('file required');
        const sto = await this.storage.upload({ owner_account_id: user.id, owner_kind: 'provider_account', mime: body.file.mime, data_base64: body.file.data_base64, original_name: body.file.original_name || body.doc_type, target: 'r2' });
        const existing = await this.docs.findOne({ account_id: user.id, doc_type: body.doc_type, review_status: { $in: [schemas_1.DocumentReviewStatus.PENDING, schemas_1.DocumentReviewStatus.NEEDS_REPLACEMENT, schemas_1.DocumentReviewStatus.UNDER_REVIEW] } });
        if (existing) {
            existing.storage_object_id = sto.id;
            existing.doc_number = body.doc_number;
            existing.issuer = body.issuer;
            existing.issued_date = body.issued_date ? new Date(body.issued_date) : undefined;
            existing.expiry_date = body.expiry_date ? new Date(body.expiry_date) : undefined;
            existing.review_status = schemas_1.DocumentReviewStatus.PENDING;
            existing.reviewer_id = undefined;
            existing.reviewer_note = undefined;
            existing.reviewed_at = undefined;
            await existing.save();
            await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'kyc.document_replaced', after: { doc_type: body.doc_type, id: existing.id } });
            return existing;
        }
        const doc = await this.docs.create({ account_id: user.id, doc_type: body.doc_type, storage_object_id: sto.id, doc_number: body.doc_number, issuer: body.issuer, issued_date: body.issued_date ? new Date(body.issued_date) : undefined, expiry_date: body.expiry_date ? new Date(body.expiry_date) : undefined });
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'kyc.document_uploaded', after: { doc_type: body.doc_type, id: doc.id } });
        return doc;
    }
    async listDocuments(user) {
        const docs = await this.docs.find({ account_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
        const a = await this.accounts.findOne({ id: user.id });
        const required = provider_enums_1.REQUIRED_DOCS_BY_PROVIDER_TYPE[a.provider_type];
        const presentTypes = new Set(docs.map((d) => d.doc_type));
        const missing = required.filter((r) => !presentTypes.has(r));
        return { documents: docs, required, missing };
    }
    async upsertBank(user, body) {
        if (!body?.bank_code || !body?.holder_name || !body?.iban)
            throw new common_1.BadRequestException('bank_code/holder_name/iban required');
        const cleanIban = validateIban(body.iban);
        if (!cleanIban)
            throw new common_1.BadRequestException('invalid IBAN: must be SA followed by 22 digits');
        const bankRef = schemas_1.SAUDI_BANKS.find((b) => b.code === body.bank_code);
        if (!bankRef)
            throw new common_1.BadRequestException('unknown bank_code');
        const existing = await this.banks.findOne({ account_id: user.id });
        if (existing) {
            existing.bank_code = body.bank_code;
            existing.bank_name = bankRef.name_ar;
            existing.holder_name = body.holder_name;
            existing.iban = cleanIban;
            existing.vat_number = body.vat_number;
            existing.review_status = schemas_1.BankReviewStatus.PENDING;
            existing.reviewer_id = undefined;
            existing.reviewer_note = undefined;
            await existing.save();
            await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'bank.updated' });
            return existing;
        }
        const b = await this.banks.create({ account_id: user.id, bank_code: body.bank_code, bank_name: bankRef.name_ar, holder_name: body.holder_name, iban: cleanIban, vat_number: body.vat_number });
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'bank.created' });
        return b;
    }
    async getBank(user) { return this.banks.findOne({ account_id: user.id }, { _id: 0, __v: 0 }); }
    banks_list() { return schemas_1.SAUDI_BANKS; }
    async submitForApproval(user) {
        const a = await this.accounts.findOne({ id: user.id });
        if (!a)
            throw new common_1.NotFoundException();
        if (!a.email_verified)
            throw new common_1.BadRequestException('email not verified');
        if ([provider_enums_1.ProviderAccountStatus.PENDING_ADMIN_APPROVAL, provider_enums_1.ProviderAccountStatus.UNDER_REVIEW, provider_enums_1.ProviderAccountStatus.APPROVED].includes(a.status)) {
            return { account: a.toObject(), already: true };
        }
        const profile = await this.profiles.findOne({ account_id: user.id });
        if (!profile?.display_name_ar)
            throw new common_1.BadRequestException('display_name_ar required');
        if (!(profile.phones || []).length)
            throw new common_1.BadRequestException('at least one phone is required');
        if (!profile.address?.city)
            throw new common_1.BadRequestException('address.city required');
        const required = provider_enums_1.REQUIRED_DOCS_BY_PROVIDER_TYPE[a.provider_type];
        const docs = await this.docs.find({ account_id: user.id });
        const present = new Set(docs.map((d) => d.doc_type));
        const missing = required.filter((r) => !present.has(r));
        if (missing.length)
            throw new common_1.BadRequestException('missing documents: ' + missing.join(', '));
        const bank = await this.banks.findOne({ account_id: user.id });
        if (!bank)
            throw new common_1.BadRequestException('bank account required');
        if (a.status === provider_enums_1.ProviderAccountStatus.EMAIL_VERIFIED) {
            a.status_history.push({ from: a.status, to: provider_enums_1.ProviderAccountStatus.ONBOARDING, by_user_id: user.id, by_role: 'provider', at: new Date() });
            a.status = provider_enums_1.ProviderAccountStatus.ONBOARDING;
        }
        a.status_history.push({ from: a.status, to: provider_enums_1.ProviderAccountStatus.PENDING_ADMIN_APPROVAL, by_user_id: user.id, by_role: 'provider', at: new Date() });
        a.status = provider_enums_1.ProviderAccountStatus.PENDING_ADMIN_APPROVAL;
        a.onboarding_progress = { profile: true, location: !!profile.geo?.lat, documents: true, bank: true, submitted: true };
        await a.save();
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'onboarding.submitted' });
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'onboarding.submitted' });
        return { account: a.toObject() };
    }
    async submitDelta(user, body) {
        const requested = (body && typeof body === 'object' && body.changes && typeof body.changes === 'object' && Object.keys(body).length <= 2)
            ? body.changes
            : (body && typeof body === 'object' && body.newData && typeof body.newData === 'object' && Object.keys(body).length <= 2)
                ? body.newData
                : body;
        const delta = {
            id: (0, uuid_1.v4)(),
            provider_id: user.id,
            requested_changes: requested,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await this.connection.collection('provider_deltas').insertOne(delta);
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'delta.submitted' });
        return { ok: true, message: 'delta_submitted', data: delta };
    }
    async directory() {
        const accounts = await this.accounts.model.find({ provider_type: 'doctor' }).limit(50).exec();
        const profiles = await this.profiles.model.find({ account_id: { $in: accounts.map(a => a.id) } }).exec();
        return accounts.map(a => {
            const p = profiles.find(pr => pr.account_id === a.id);
            return {
                id: a.id,
                name: p?.display_name_ar || p?.display_name_en || 'طبيب',
                spec: p?.specialty || '',
                hospital: p?.hospital || '',
            };
        });
    }
};
exports.ProviderProfileService = ProviderProfileService;
exports.ProviderProfileService = ProviderProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderAccountRepository')),
    __param(1, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __param(2, (0, common_1.Inject)('ProviderDocumentRepository')),
    __param(3, (0, common_1.Inject)('ProviderBankAccountRepository')),
    __param(4, (0, common_1.Inject)('ProviderAuditLogRepository')),
    __param(5, (0, mongoose_2.InjectConnection)()),
    __metadata("design:paramtypes", [provideraccount_repository_1.ProviderAccountRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository,
        providerdocument_repository_1.ProviderDocumentRepository,
        providerbankaccount_repository_1.ProviderBankAccountRepository,
        providerauditlog_repository_1.ProviderAuditLogRepository,
        mongoose_1.Connection,
        storage_module_1.StorageService])
], ProviderProfileService);
//# sourceMappingURL=provider-profile.service.js.map