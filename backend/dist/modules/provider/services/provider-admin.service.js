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
exports.ProviderAdminService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const schemas_1 = require("../schemas");
const provider_enums_1 = require("../provider.enums");
const provideraccount_repository_1 = require("./repositories/provideraccount.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const providerdocument_repository_1 = require("./repositories/providerdocument.repository");
const providerbankaccount_repository_1 = require("./repositories/providerbankaccount.repository");
const providerauditlog_repository_1 = require("./repositories/providerauditlog.repository");
let ProviderAdminService = class ProviderAdminService {
    constructor(accounts, profiles, docs, banks, audit, events) {
        this.accounts = accounts;
        this.profiles = profiles;
        this.docs = docs;
        this.banks = banks;
        this.audit = audit;
        this.events = events;
    }
    async purgeImages(values) {
        const flat = [];
        for (const v of values) {
            if (Array.isArray(v))
                flat.push(...v.map(String));
            else if (v)
                flat.push(String(v));
        }
        for (const s of flat) {
            try {
                let url = s.startsWith('http') ? s : null;
                if (!url) {
                    const obj = await this.accounts.model.db.collection('storage_objects').findOne({ id: s });
                    url = obj?.external_url || null;
                }
                if (url)
                    this.events.emit('storage.delete_by_url', { url });
            }
            catch { }
        }
    }
    assertAdmin(user) { if (user.role !== 'admin')
        throw new common_1.ForbiddenException('admin only'); }
    async list(user, q) {
        this.assertAdmin(user);
        const filter = {};
        if (q.status)
            filter.status = q.status === 'pending' ? provider_enums_1.ProviderAccountStatus.PENDING_ADMIN_APPROVAL : q.status;
        if (q.provider_type)
            filter.provider_type = q.provider_type;
        if (q.search)
            filter.email = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const page = Math.max(1, parseInt(String(q.page || 1)));
        const limit = Math.min(100, Math.max(5, parseInt(String(q.limit || 20))));
        const [items, total] = await Promise.all([
            this.accounts.find(filter, { password_hash: 0 }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            this.accounts.countDocuments(filter),
        ]);
        const accountIds = items.map(i => i.id);
        const profiles = await this.profiles.find({ account_id: { $in: accountIds } }, { account_id: 1, display_name_ar: 1, display_name_en: 1, legal_name: 1 }).lean();
        const profileMap = new Map(profiles.map(p => [p.account_id, p]));
        const onboardingProfiles = await this.accounts.model.db.collection('provider_profiles')
            .find({ account_id: { $in: accountIds }, user_id: { $exists: true } }, { projection: { account_id: 1, name_ar: 1, name_en: 1 } }).toArray();
        const onboardingMap = new Map(onboardingProfiles.map((p) => [p.account_id, p]));
        const enrichedItems = items.map(i => {
            const p = profileMap.get(i.id);
            const o = onboardingMap.get(i.id);
            return {
                ...i,
                display_name_ar: p?.display_name_ar || p?.legal_name || o?.name_ar || 'مزود خدمة',
                display_name_en: p?.display_name_en || p?.legal_name || o?.name_en || o?.name_ar || 'Service Provider',
            };
        });
        return { items: enrichedItems, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async detail(user, id) {
        this.assertAdmin(user);
        const account = await this.accounts.findOne({ id }, { password_hash: 0 });
        if (!account)
            throw new common_1.NotFoundException();
        const [profile, docs, bank] = await Promise.all([
            this.profiles.findOne({ account_id: id }, { _id: 0, __v: 0 }),
            this.docs.find({ account_id: id }, { _id: 0, __v: 0 }),
            this.banks.findOne({ account_id: id }, { _id: 0, __v: 0 }),
        ]);
        const onboarding = await this.accounts.model.db.collection('provider_profiles').findOne({ account_id: id, user_id: { $exists: true } }, { projection: { _id: 0, __v: 0 } });
        return { account, profile, documents: docs, bank, onboarding: onboarding || null };
    }
    async detailByUser(user, userId) {
        this.assertAdmin(user);
        const onboarding = await this.accounts.model.db.collection('provider_profiles').findOne({ user_id: userId, is_deleted: { $ne: true } }, { projection: { _id: 0, __v: 0 } });
        if (!onboarding)
            throw new common_1.NotFoundException('لا يوجد ملف مزود مرتبط بهذا المستخدم');
        const accountId = onboarding.account_id;
        const account = accountId ? await this.accounts.findOne({ id: accountId }, { password_hash: 0 }) : null;
        const [profile, docs, bank] = accountId ? await Promise.all([
            this.profiles.findOne({ account_id: accountId }, { _id: 0, __v: 0 }),
            this.docs.find({ account_id: accountId }, { _id: 0, __v: 0 }),
            this.banks.findOne({ account_id: accountId }, { _id: 0, __v: 0 }),
        ]) : [null, [], null];
        return { account, profile, documents: docs, bank, onboarding };
    }
    async transition(account, to, user, note) {
        const allowed = provider_enums_1.PROVIDER_STATUS_TRANSITIONS[account.status] || [];
        if (!allowed.includes(to))
            throw new common_1.BadRequestException(`invalid transition ${account.status} → ${to}`);
        account.status_history.push({ from: account.status, to, by_user_id: user.id, by_role: 'admin', at: new Date(), note });
        account.status = to;
    }
    async approve(user, id, body) {
        this.assertAdmin(user);
        const a = await this.accounts.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        await this.transition(a, provider_enums_1.ProviderAccountStatus.APPROVED, user, body?.note);
        a.approved_at = new Date();
        a.approved_by = user.id;
        await a.save();
        if (body?.commission !== undefined) {
            await this.profiles.updateOne({ account_id: id }, { $set: { commission_rate: Number(body.commission) } });
        }
        await this.docs.updateMany({ account_id: id, review_status: { $in: [schemas_1.DocumentReviewStatus.PENDING, schemas_1.DocumentReviewStatus.UNDER_REVIEW] } }, { $set: { review_status: schemas_1.DocumentReviewStatus.APPROVED, reviewer_id: user.id, reviewed_at: new Date() } });
        await this.banks.updateMany({ account_id: id, review_status: { $in: [schemas_1.BankReviewStatus.PENDING, schemas_1.BankReviewStatus.UNDER_REVIEW] } }, { $set: { review_status: schemas_1.BankReviewStatus.APPROVED, reviewer_id: user.id } });
        await this.accounts.model.db.collection('provider_profiles').updateMany({ account_id: id, user_id: { $exists: true } }, { $set: { status: 'active', approved_at: new Date(), approved_by: user.id, rejected_reason: null } });
        await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_approved', after: { note: body?.note, commission: body?.commission } });
        return a.toObject();
    }
    async reject(user, id, body) {
        this.assertAdmin(user);
        const a = await this.accounts.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        await this.transition(a, provider_enums_1.ProviderAccountStatus.REJECTED, user, body?.reason);
        a.rejection_reason = body?.reason || 'rejected';
        await a.save();
        await this.accounts.model.db.collection('provider_profiles').updateMany({ account_id: id, user_id: { $exists: true } }, { $set: { status: 'rejected', rejected_reason: a.rejection_reason } });
        await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_rejected', after: { reason: a.rejection_reason } });
        const prof = await this.accounts.model.db.collection('provider_profiles').findOne({ account_id: id });
        if (prof) {
            const docs = await this.accounts.model.db.collection('providerdocuments').find({ account_id: id }).toArray();
            await this.purgeImages([
                prof.profile_photo, prof.logo, prof.clinic_images, prof.license_documents,
                ...docs.map((d) => d.file_url || d.storage_id || d.url),
            ]);
        }
        return a.toObject();
    }
    async requestChanges(user, id, body) {
        this.assertAdmin(user);
        const a = await this.accounts.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        await this.transition(a, provider_enums_1.ProviderAccountStatus.NEEDS_CHANGES, user, body?.note);
        await a.save();
        if (Array.isArray(body?.docs_needing_replacement)) {
            await this.docs.updateMany({ account_id: id, doc_type: { $in: body.docs_needing_replacement } }, { $set: { review_status: schemas_1.DocumentReviewStatus.NEEDS_REPLACEMENT, reviewer_id: user.id, reviewer_note: body?.note, reviewed_at: new Date() } });
        }
        await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_needs_changes', after: { note: body?.note, docs: body?.docs_needing_replacement } });
        return a.toObject();
    }
    async suspend(user, id, body) {
        this.assertAdmin(user);
        const a = await this.accounts.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        await this.transition(a, provider_enums_1.ProviderAccountStatus.SUSPENDED, user, body?.reason);
        await a.save();
        await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_suspended', after: { reason: body?.reason } });
        return a.toObject();
    }
};
exports.ProviderAdminService = ProviderAdminService;
exports.ProviderAdminService = ProviderAdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderAccountRepository')),
    __param(1, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __param(2, (0, common_1.Inject)('ProviderDocumentRepository')),
    __param(3, (0, common_1.Inject)('ProviderBankAccountRepository')),
    __param(4, (0, common_1.Inject)('ProviderAuditLogRepository')),
    __metadata("design:paramtypes", [provideraccount_repository_1.ProviderAccountRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository,
        providerdocument_repository_1.ProviderDocumentRepository,
        providerbankaccount_repository_1.ProviderBankAccountRepository,
        providerauditlog_repository_1.ProviderAuditLogRepository,
        event_emitter_1.EventEmitter2])
], ProviderAdminService);
//# sourceMappingURL=provider-admin.service.js.map