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
exports.HomeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const promotion_campaign_schema_1 = require("../../schemas/promotion-campaign.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const core_1 = require("@nestjs/core");
let HomeService = class HomeService {
    constructor(promoModel, apptModel, request) {
        this.promoModel = promoModel;
        this.apptModel = apptModel;
        this.request = request;
    }
    async getOffers() {
        const campaigns = await this.promoModel.find({ status: 'active' }).limit(10).exec();
        const providerIds = [...new Set(campaigns.map((c) => c.provider_id).filter(Boolean).map(String))];
        const providers = providerIds.length
            ? await this.promoModel.db.collection('provider_profiles')
                .find({ $or: [{ id: { $in: providerIds } }, { user_id: { $in: providerIds } }, { account_id: { $in: providerIds } }] })
                .toArray()
            : [];
        const provMap = new Map();
        for (const p of providers) {
            for (const key of [p.id, p.user_id, p.account_id].filter(Boolean))
                provMap.set(String(key), p);
        }
        return campaigns.map(c => {
            const prov = c.provider_id ? provMap.get(String(c.provider_id)) : null;
            return {
                id: c.id || String(c._id),
                t: c.title_ar,
                price: c.discounted_price,
                old: c.original_price,
                disc: Math.round(((c.original_price - c.discounted_price) / c.original_price) * 100) + '%',
                rating: prov?.rating_avg ?? null,
                prov: prov?.name || prov?.facility_name || 'شريك نبض',
                c: '#FF4B55',
                ic: 'local_offer',
                sponsored: c.target_parameters?.sponsored || false,
            };
        });
    }
    async getUpcomingAppointment() {
        const userId = this.request.user?.id;
        if (!userId)
            return null;
        const upcoming = await this.apptModel.findOne({
            patient_id: userId,
            status: { $in: ['PENDING', 'CONFIRMED'] },
            slot_start: { $gte: new Date() }
        }).sort({ slot_start: 1 }).exec();
        if (!upcoming)
            return null;
        const dateStr = upcoming.slot_start.toISOString().split('T')[0];
        const timeStr = upcoming.slot_start.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
        let typeAr = 'استشارة في العيادة';
        if (upcoming.service_type === 'video')
            typeAr = 'استشارة فيديو';
        else if (upcoming.service_type === 'home')
            typeAr = 'زيارة منزلية';
        let doctorName = '';
        if (upcoming.doctor_id) {
            const prov = await this.apptModel.db.collection('provider_profiles').findOne({
                $or: [{ id: upcoming.doctor_id }, { user_id: upcoming.doctor_user_id }, { account_id: upcoming.doctor_id }],
            });
            doctorName = prov?.name || '';
        }
        return {
            id: upcoming.id || String(upcoming._id),
            date: dateStr,
            doctorName: doctorName || null,
            type: typeAr,
            time: timeStr
        };
    }
    async globalSearch(query) {
        const q = (query || '').trim();
        if (q.length === 0)
            return [];
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const db = this.promoModel.db;
        const userId = this.request.user?.id;
        const [campaigns, doctors, medicines, labs, rads, articles, diseaseArticles, insurers, posts, familyGroup] = await Promise.all([
            this.promoModel.find({ $or: [{ title_ar: regex }, { title_en: regex }] }).limit(10).lean(),
            db.collection('provider_profiles').find({
                type: 'doctor', status: 'active',
                $or: [{ name_ar: regex }, { name_en: regex }, { specialty: regex }, { hospital: regex }],
            }).limit(6).toArray(),
            db.collection('medicines_master').find({
                verified: true,
                $or: [{ name_ar: regex }, { name_en: regex }, { active_ingredient: regex }],
            }).limit(6).toArray(),
            db.collection('labservices').find({
                $or: [{ name_ar: regex }, { name_en: regex }, { short_code: regex }],
            }).limit(5).toArray(),
            db.collection('radiologyservices').find({
                $or: [{ name_ar: regex }, { name_en: regex }, { body_part: regex }],
            }).limit(5).toArray(),
            db.collection('articles').find({
                status: 'PUBLISHED',
                $or: [{ title_ar: regex }, { title_en: regex }, { excerpt_ar: regex }, { tags: regex }],
            }).limit(5).toArray(),
            db.collection('articles').find({
                status: 'PUBLISHED', category: 'أمراض مزمنة',
                $or: [{ title_ar: regex }, { excerpt_ar: regex }, { tags: regex }],
            }).limit(3).toArray(),
            db.collection('insurance_companies').find({
                is_active: true,
                $or: [{ name_ar: regex }, { name_en: regex }, { code: regex }],
            }).limit(4).toArray(),
            db.collection('community_posts').find({
                status: 'published', is_deleted: false,
                $or: [{ title: regex }, { body: regex }, { tags: regex }],
            }).limit(5).toArray(),
            userId
                ? db.collection('family_groups').findOne({ 'members.user_id': userId })
                : Promise.resolve(null),
        ]);
        const providerIds = [...new Set(campaigns.map((c) => c.provider_id).filter(Boolean).map(String))];
        const providers = providerIds.length
            ? await db.collection('provider_profiles')
                .find({ $or: [{ id: { $in: providerIds } }, { user_id: { $in: providerIds } }, { account_id: { $in: providerIds } }] })
                .toArray()
            : [];
        const provMap = new Map();
        for (const p of providers) {
            for (const key of [p.id, p.user_id, p.account_id].filter(Boolean))
                provMap.set(String(key), p);
        }
        const results = [];
        for (const c of campaigns) {
            const provName = (c.provider_id && (provMap.get(String(c.provider_id))?.name || provMap.get(String(c.provider_id))?.facility_name)) || null;
            results.push({
                id: c._id?.toString() || c.id,
                type: 'باقة', typeEn: 'Package',
                name: c.title_ar, nameEn: c.title_en || c.title_ar,
                sub: provName || 'عرض نبض', subEn: provName || 'Nabd Offer',
                ic: 'local_offer', c: '#7A6BEA', cs: '#F2F0FD',
                price: String(c.discounted_price || c.original_price || 0),
                priceEn: String(c.discounted_price || c.original_price || 0),
                sponsored: c.target_parameters?.sponsored || false,
            });
        }
        for (const d of doctors) {
            const rating = d.rating ?? d.rating_avg;
            results.push({
                id: d.id, type: 'دكتور', typeEn: 'Doctor',
                name: d.name_ar || d.name_en, nameEn: d.name_en || d.name_ar,
                sub: d.specialty || 'طبيب', subEn: d.specialty || 'Doctor',
                ic: 'stethoscope', c: '#2E86FF', cs: '#EAF3FF',
                rate: rating != null ? String(rating) : null,
                rateEn: rating != null ? String(rating) : null,
                price: d.price_clinic != null ? String(d.price_clinic) : null,
                priceEn: d.price_clinic != null ? String(d.price_clinic) : null,
            });
        }
        for (const m of medicines) {
            results.push({
                id: m.id, type: 'دواء', typeEn: 'Medicine',
                name: m.name_ar, nameEn: m.name_en || m.name_ar,
                sub: m.active_ingredient || m.manufacturer || 'دواء',
                subEn: m.active_ingredient || m.manufacturer || 'Medicine',
                ic: 'pill', c: '#FF4B55', cs: '#FFEBEC',
                price: m.price != null ? String(m.price) : null,
                priceEn: m.price != null ? String(m.price) : null,
            });
        }
        for (const l of labs) {
            results.push({
                id: l.id, type: 'تحليل', typeEn: 'Lab',
                name: l.name_ar, nameEn: l.name_en || l.name_ar,
                sub: l.short_code || 'تحليل مختبر', subEn: l.short_code || 'Lab test',
                ic: 'biotech', c: '#00A0AF', cs: '#E5F7F9',
                price: l.price != null ? String(l.price) : null,
                priceEn: l.price != null ? String(l.price) : null,
            });
        }
        for (const r of rads) {
            results.push({
                id: r.id, type: 'أشعة', typeEn: 'Radiology',
                name: r.name_ar, nameEn: r.name_en || r.name_ar,
                sub: r.body_part || 'أشعة', subEn: r.body_part || 'Radiology',
                ic: 'radiology', c: '#8E44AD', cs: '#F3EAF7',
                price: r.price != null ? String(r.price) : null,
                priceEn: r.price != null ? String(r.price) : null,
            });
        }
        const articleSlugs = new Set();
        for (const a of articles) {
            articleSlugs.add(a.slug);
            results.push({
                id: a.slug, slug: a.slug, type: 'مقال', typeEn: 'Article',
                name: a.title_ar, nameEn: a.title_en || a.title_ar,
                sub: a.category || 'مقال صحي', subEn: a.category || 'Health article',
                ic: 'article', c: '#5BA84F', cs: '#EDF6EC',
            });
        }
        for (const a of diseaseArticles) {
            if (articleSlugs.has(a.slug))
                continue;
            results.push({
                id: a.slug, slug: a.slug, type: 'مرض', typeEn: 'Disease',
                name: a.title_ar, nameEn: a.title_en || a.title_ar,
                sub: 'معلومات طبية', subEn: 'Medical info',
                ic: 'healing', c: '#E67E22', cs: '#FCF0E3',
            });
        }
        for (const i of insurers) {
            results.push({
                id: i.id, type: 'تأمين', typeEn: 'Insurance',
                name: i.name_ar, nameEn: i.name_en || i.name_ar,
                sub: 'شركة تأمين', subEn: 'Insurance company',
                ic: 'health_and_safety', c: '#1ABC9C', cs: '#E6F8F5',
            });
        }
        for (const p of posts) {
            results.push({
                id: p.id, type: 'مجتمع', typeEn: 'Community',
                name: p.title, nameEn: p.title,
                sub: `${p.upvotes ?? 0} إعجاب · ${p.comment_count ?? 0} تعليق`,
                subEn: `${p.upvotes ?? 0} likes · ${p.comment_count ?? 0} comments`,
                ic: 'groups', c: '#F5A623', cs: '#FEF4E4',
            });
        }
        if (familyGroup?.members?.length) {
            for (const m of familyGroup.members) {
                if (!regex.test(m.display_name || '') && !regex.test(m.relation || ''))
                    continue;
                results.push({
                    id: m.user_id, type: 'عائلة', typeEn: 'Family',
                    name: m.display_name || 'فرد من العائلة', nameEn: m.display_name || 'Family member',
                    sub: m.relation || 'عائلتي', subEn: m.relation || 'My family',
                    ic: 'family_restroom', c: '#E84393', cs: '#FDEAF3',
                });
            }
        }
        return results;
    }
};
exports.HomeService = HomeService;
exports.HomeService = HomeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(promotion_campaign_schema_1.PromotionCampaign.name)),
    __param(1, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(2, (0, common_1.Inject)(core_1.REQUEST)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model, Object])
], HomeService);
//# sourceMappingURL=home.service.js.map