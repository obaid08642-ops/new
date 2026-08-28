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
exports.SeoService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const seo_controls_util_1 = require("./seo-controls.util");
const slug_util_1 = require("../../common/slug.util");
const medicine_repository_1 = require("./repositories/medicine.repository");
const labservice_repository_1 = require("./repositories/labservice.repository");
const homecareservice_repository_1 = require("./repositories/homecareservice.repository");
const facility_repository_1 = require("./repositories/facility.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const PUBLIC_BASE = process.env.NABD_PUBLIC_URL || 'https://nabd.plus';
let SeoService = class SeoService {
    constructor(medM, labSvcM, hcSvcM, facilityM, providerM, articleM, conn) {
        this.medM = medM;
        this.labSvcM = labSvcM;
        this.hcSvcM = hcSvcM;
        this.facilityM = facilityM;
        this.providerM = providerM;
        this.articleM = articleM;
        this.conn = conn;
        this.controlsCache = null;
    }
    async loadControls() {
        const now = Date.now();
        if (this.controlsCache && this.controlsCache.exp > now)
            return this.controlsCache.map;
        let rows = [];
        try {
            rows = await this.conn.collection('seo_controls').find({}).toArray();
        }
        catch {
            rows = [];
        }
        const map = (0, seo_controls_util_1.controlsMap)(rows);
        this.controlsCache = { map, exp: now + 30_000 };
        return map;
    }
    invalidateControlsCache() {
        this.controlsCache = null;
    }
    modelFor(type) {
        switch (type) {
            case 'medicine': return this.medM;
            case 'lab-service': return this.labSvcM;
            case 'home-care-service': return this.hcSvcM;
            case 'doctor': return this.providerM;
            case 'facility': return this.facilityM;
            case 'article': return this.articleM;
            default: return null;
        }
    }
    publicQuery(type, indexed = false) {
        if (type === 'article')
            return { status: 'PUBLISHED', is_deleted: { $ne: true } };
        const governed = {
            public_eligibility: true,
            medical_review_status: 'approved',
            ...(indexed ? { indexing_eligibility: true } : {}),
        };
        switch (type) {
            case 'medicine': return { ...governed, active: { $ne: false }, is_deleted: { $ne: true } };
            case 'doctor': return { ...governed, type: 'doctor', status: 'active', is_deleted: { $ne: true } };
            case 'facility': return { ...governed, is_active: true, is_deleted: { $ne: true } };
            case 'lab-service':
            case 'home-care-service': return { ...governed, active: true, is_deleted: { $ne: true } };
            default: return { ...governed, is_deleted: { $ne: true } };
        }
    }
    async resolve(type, slug) {
        const model = this.modelFor(type);
        if (!model)
            return null;
        const exact = await model.findOne({ ...this.publicQuery(type), slug }, { _id: 0, __v: 0 }).lean();
        if (exact)
            return exact;
        const sfx = (0, slug_util_1.parseSlugSuffix)(slug);
        if (!sfx) {
            const re = new RegExp(slug.replace(/-/g, ' '), 'i');
            return model.findOne({ ...this.publicQuery(type), $or: [{ name_en: re }, { name_ar: re }, { full_name: re }] }, { _id: 0, __v: 0 }).lean();
        }
        const reId = new RegExp(`^${sfx}`, 'i');
        return model.findOne({ ...this.publicQuery(type), id: { $regex: reId } }, { _id: 0, __v: 0 }).lean();
    }
    async meta(type, slug) {
        const entity = await this.resolve(type, slug);
        if (!entity) {
            return {
                found: false,
                title: 'نبض بلس | Nabd Plus',
                description: 'منصة نبض بلس للرعاية الصحية والخدمات الطبية',
            };
        }
        const name = entity.name_ar || entity.name_en || entity.full_name || entity.title_ar || entity.title_en || 'Nabd item';
        const desc = this.composeDescription(type, entity);
        const image = entity.image || entity.avatar || entity.cover || undefined;
        const url = this.buildShareUrl(type, name, entity.id);
        return {
            found: true,
            type,
            id: entity.id,
            slug: (0, slug_util_1.buildSlug)(name, entity.id),
            title: `${name} • نبض بلس`,
            description: desc,
            image,
            canonical: url,
            og: {
                type: type === 'doctor' ? 'profile' : 'product',
                title: name,
                description: desc,
                url,
                image,
                locale: 'ar_SA',
                site_name: 'نبض بلس | Nabd Plus',
            },
            twitter: {
                card: image ? 'summary_large_image' : 'summary',
                title: name,
                description: desc,
                image,
            },
            structured: this.structuredData(type, entity, url),
            entity,
        };
    }
    async buildShareLink(type, id) {
        const model = this.modelFor(type);
        if (!model)
            return { ok: false, reason: 'unknown_type' };
        const entity = await model.findOne({ ...this.publicQuery(type), id }, { _id: 0 }).lean();
        if (!entity)
            return { ok: false, reason: 'not_found' };
        const name = entity.name_ar || entity.name_en || entity.full_name || 'item';
        return {
            ok: true,
            url: this.buildShareUrl(type, name, id),
            slug: (0, slug_util_1.buildSlug)(name, id),
            deep_link: `nabdplus://s/${type}/${(0, slug_util_1.buildSlug)(name, id)}`,
        };
    }
    buildShareUrl(type, name, id) {
        return `${PUBLIC_BASE}/s/${type}/${(0, slug_util_1.buildSlug)(name, id)}`;
    }
    composeDescription(type, e) {
        switch (type) {
            case 'medicine': {
                const parts = [
                    e.active_ingredient && `المادة الفعالة: ${e.active_ingredient}`,
                    e.manufacturer && `الشركة: ${e.manufacturer}`,
                    typeof e.price === 'number' && `السعر: ${e.price} ر.س`,
                    e.requires_prescription && 'يتطلب وصفة طبية',
                ].filter(Boolean);
                return parts.join(' • ') || 'متاح عبر نبض بلس';
            }
            case 'doctor': {
                const parts = [
                    e.specialty && `${e.specialty}`,
                    e.experience_years && `خبرة ${e.experience_years}+ سنوات`,
                    e.consultation_fee && `رسوم الاستشارة: ${e.consultation_fee} ر.س`,
                ].filter(Boolean);
                return parts.join(' • ') || 'طبيب على نبض بلس';
            }
            case 'article': {
                return e.seo_description_ar || e.excerpt_ar || e.seo_description_en || e.excerpt_en || 'مقال صحي موثوق على منصة نبض بلس';
            }
            case 'lab-service': {
                const parts = [
                    e.category && e.category,
                    typeof e.price === 'number' && `${e.price} ر.س`,
                    e.turnaround_hours && `النتيجة خلال ${e.turnaround_hours} ساعة`,
                ].filter(Boolean);
                return parts.join(' • ') || 'خدمة تحاليل على نبض بلس';
            }
            case 'home-care-service': {
                const parts = [
                    e.category && e.category,
                    typeof e.price === 'number' && `${e.price} ر.س`,
                    e.duration && `المدة: ${e.duration}`,
                ].filter(Boolean);
                return parts.join(' • ') || 'رعاية منزلية على نبض بلس';
            }
            default:
                return 'نبض بلس | Nabd Plus health platform';
        }
    }
    structuredData(type, e, url) {
        const name = e.name_ar || e.name_en || e.full_name || e.title_ar || e.title_en;
        const base = { '@context': 'https://schema.org', name, url };
        switch (type) {
            case 'medicine':
                return { ...base, '@type': 'Drug', activeIngredient: e.active_ingredient, manufacturer: e.manufacturer ? { '@type': 'Organization', name: e.manufacturer } : undefined };
            case 'doctor':
                return { ...base, '@type': 'Physician', medicalSpecialty: e.specialty, image: e.avatar };
            case 'lab-service':
                return { ...base, '@type': 'MedicalTest', usesDevice: e.equipment };
            case 'home-care-service':
                return { ...base, '@type': 'MedicalProcedure', category: e.category };
            case 'article':
                return {
                    ...base,
                    '@type': 'Article',
                    headline: e.title_ar || e.title_en,
                    image: e.cover_image,
                    datePublished: e.published_at,
                    author: e.author_name ? { '@type': 'Person', name: e.author_name, jobTitle: e.author_title } : undefined,
                };
            default:
                return base;
        }
    }
    async sitemap() {
        const now = new Date().toISOString();
        const urls = [];
        urls.push(`<url><loc>${PUBLIC_BASE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);
        const pushEntities = async (type, model, query, priority = 0.7, changefreq = 'weekly') => {
            const docs = await model
                .find(query, { id: 1, name_ar: 1, name_en: 1, full_name: 1, title_ar: 1, title_en: 1, updatedAt: 1 })
                .lean()
                .limit(5000);
            for (const d of docs) {
                const name = d.name_ar || d.name_en || d.full_name || d.title_ar || d.title_en || 'item';
                const slug = (0, slug_util_1.buildSlug)(name, d.id);
                const lastmod = d.updatedAt ? new Date(d.updatedAt).toISOString() : now;
                urls.push(`<url><loc>${PUBLIC_BASE}/s/${type}/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`);
            }
        };
        const controls = await this.loadControls();
        if ((0, seo_controls_util_1.isTypeIndexable)('medicine', controls))
            await pushEntities('medicine', this.medM, this.publicQuery('medicine', true), 0.8);
        if ((0, seo_controls_util_1.isTypeIndexable)('doctor', controls))
            await pushEntities('doctor', this.providerM, this.publicQuery('doctor', true), 0.85, 'weekly');
        if ((0, seo_controls_util_1.isTypeIndexable)('lab-service', controls))
            await pushEntities('lab-service', this.labSvcM, this.publicQuery('lab-service', true), 0.7);
        if ((0, seo_controls_util_1.isTypeIndexable)('home-care-service', controls))
            await pushEntities('home-care-service', this.hcSvcM, this.publicQuery('home-care-service', true), 0.7);
        if ((0, seo_controls_util_1.isTypeIndexable)('facility', controls))
            await pushEntities('facility', this.facilityM, this.publicQuery('facility', true), 0.6, 'monthly');
        if ((0, seo_controls_util_1.isTypeIndexable)('article', controls))
            await pushEntities('article', this.articleM, this.publicQuery('article', true), 0.6, 'weekly');
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
    }
    async robots() {
        const controls = await this.loadControls();
        return [
            'User-agent: *',
            'Allow: /',
            'Disallow: /api/',
            'Disallow: /admin/',
            'Disallow: /pharmacy-provider',
            'Disallow: /health/',
            'Disallow: /order/',
            'Disallow: /labs/bookings',
            'Disallow: /home-care/bookings',
            ...(0, seo_controls_util_1.robotsDisallowLines)(controls),
            '',
            `Sitemap: ${PUBLIC_BASE}/api/v1/seo/sitemap.xml`,
            '',
            '# AI crawlers — see llms.txt for a structured site overview',
            `# LLMS: ${PUBLIC_BASE}/api/v1/seo/llms.txt`,
            '',
        ].join('\n');
    }
    async llmsTxt() {
        const lines = [];
        lines.push('# Nabd (نَبْض)');
        lines.push('');
        lines.push('> Saudi healthcare super-app: book doctors (clinic, video, home visit), order medicines with delivery, book lab tests, radiology, nursing and home-care visits — with Saudi insurance integration (bupa, Tawuniya, MedGulf and more), Moyasar payments, and real-time telehealth.');
        lines.push('');
        lines.push('## Platform');
        lines.push('');
        lines.push(`- [Homepage](${PUBLIC_BASE}/): patient, provider and pharmacy apps plus an admin dashboard`);
        lines.push(`- [Sitemap](${PUBLIC_BASE}/api/v1/seo/sitemap.xml): every public doctor, medicine, service, facility and article`);
        lines.push('');
        try {
            const doctors = await this.providerM
                .find(this.publicQuery('doctor', true), { id: 1, name_ar: 1, name_en: 1, full_name: 1, specialty: 1, city: 1, rating_avg: 1 })
                .sort({ rating_avg: -1 })
                .limit(30)
                .lean();
            if (doctors.length) {
                lines.push('## Doctors (أطباء)');
                lines.push('');
                for (const d of doctors) {
                    const name = d.name_ar || d.name_en || d.full_name || 'Doctor';
                    const slug = (0, slug_util_1.buildSlug)(name, d.id);
                    const meta = [d.specialty, d.city].filter(Boolean).join(' · ');
                    lines.push(`- [${name}](${PUBLIC_BASE}/s/doctor/${slug})${meta ? `: ${meta}` : ''}`);
                }
                lines.push('');
            }
        }
        catch { }
        try {
            const meds = await this.medM
                .find(this.publicQuery('medicine', true), { id: 1, name_ar: 1, name_en: 1, category: 1 })
                .limit(30)
                .lean();
            if (meds.length) {
                lines.push('## Medicines (أدوية)');
                lines.push('');
                for (const m of meds) {
                    const name = m.name_ar || m.name_en || 'Medicine';
                    const slug = (0, slug_util_1.buildSlug)(name, m.id);
                    lines.push(`- [${name}](${PUBLIC_BASE}/s/medicine/${slug})${m.category ? `: ${m.category}` : ''}`);
                }
                lines.push('');
            }
        }
        catch { }
        try {
            const labSvcs = await this.labSvcM
                .find(this.publicQuery('lab-service', true), { id: 1, name_ar: 1, name_en: 1 })
                .limit(15)
                .lean();
            if (labSvcs.length) {
                lines.push('## Lab tests (تحاليل مخبرية)');
                lines.push('');
                for (const s of labSvcs) {
                    const name = s.name_ar || s.name_en || 'Lab service';
                    lines.push(`- [${name}](${PUBLIC_BASE}/s/lab-service/${(0, slug_util_1.buildSlug)(name, s.id)})`);
                }
                lines.push('');
            }
        }
        catch { }
        try {
            const hcSvcs = await this.hcSvcM
                .find(this.publicQuery('home-care-service', true), { id: 1, name_ar: 1, name_en: 1 })
                .limit(15)
                .lean();
            if (hcSvcs.length) {
                lines.push('## Nursing & home care (تمريض ورعاية منزلية)');
                lines.push('');
                for (const s of hcSvcs) {
                    const name = s.name_ar || s.name_en || 'Home-care service';
                    lines.push(`- [${name}](${PUBLIC_BASE}/s/home-care-service/${(0, slug_util_1.buildSlug)(name, s.id)})`);
                }
                lines.push('');
            }
        }
        catch { }
        try {
            const articles = await this.articleM
                .find(this.publicQuery('article', true), { id: 1, title_ar: 1, title_en: 1, category: 1 })
                .limit(20)
                .lean();
            if (articles.length) {
                lines.push('## Health articles (مقالات صحية)');
                lines.push('');
                for (const a of articles) {
                    const title = a.title_ar || a.title_en || 'Article';
                    lines.push(`- [${title}](${PUBLIC_BASE}/s/article/${(0, slug_util_1.buildSlug)(title, a.id)})${a.category ? `: ${a.category}` : ''}`);
                }
                lines.push('');
            }
        }
        catch { }
        lines.push('## Contact & coverage');
        lines.push('');
        lines.push('- Coverage: Saudi Arabia (Riyadh, Jeddah, Dammam and expanding)');
        lines.push('- Payments: mada, Visa, Mastercard, Apple Pay (via Moyasar), cash in clinic, Saudi insurance networks');
        lines.push('');
        return lines.join('\n');
    }
    async pingIndexNow(type, id) {
        try {
            const model = this.modelFor(type);
            if (!model)
                return { ok: false };
            const entity = await model.findOne({ ...this.publicQuery(type, true), id }, { _id: 0 }).lean();
            if (!entity)
                return { ok: false };
            const name = entity.name_ar || entity.name_en || entity.full_name || 'item';
            const url = this.buildShareUrl(type, name, id);
            const key = process.env.INDEXNOW_KEY;
            if (!key) {
                return { ok: false };
            }
            const fetch = globalThis.fetch;
            if (typeof fetch === 'function') {
                await fetch('https://api.indexnow.org/IndexNow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        host: new URL(PUBLIC_BASE).host,
                        key,
                        urlList: [url],
                    }),
                }).catch(() => null);
            }
            return { ok: true };
        }
        catch {
            return { ok: false };
        }
    }
};
exports.SeoService = SeoService;
exports.SeoService = SeoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('MedicineRepository')),
    __param(1, (0, common_1.Inject)('LabServiceRepository')),
    __param(2, (0, common_1.Inject)('HomeCareServiceRepository')),
    __param(3, (0, common_1.Inject)('FacilityRepository')),
    __param(4, (0, common_1.Inject)('ProviderProfileRepository')),
    __param(5, (0, common_1.Inject)('ArticleRepository')),
    __param(6, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [medicine_repository_1.MedicineRepository,
        labservice_repository_1.LabServiceRepository,
        homecareservice_repository_1.HomeCareServiceRepository,
        facility_repository_1.FacilityRepository,
        providerprofile_repository_1.ProviderProfileRepository, Object, mongoose_2.Connection])
], SeoService);
//# sourceMappingURL=seo.service.js.map