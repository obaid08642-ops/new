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
exports.SeoSearchModule = exports.SeoSearchController = exports.SeoSearchService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const SITE = process.env.API_PUBLIC_URL?.replace('/api/v1', '') || 'https://api.nabd.plus';
const SITE_NAME = 'نبض';
function slugify(s) {
    return (s || '').trim().replace(/[\s_]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80);
}
let SeoSearchService = class SeoSearchService {
    constructor(conn) {
        this.conn = conn;
    }
    async metadata(type, id) {
        const entity = await this.loadEntity(type, id);
        if (!entity)
            return null;
        const base = this.baseFields(type, entity);
        const slug = entity.slug || slugify(`${base.title}-${String(entity.id || id).slice(0, 6)}`);
        const canonical = `${SITE}/s/${type}/${slug}`;
        const description = base.description.slice(0, 155);
        const image = base.image || `${SITE}/og-default.png`;
        return {
            type, id: entity.id, slug, canonical_url: canonical,
            page_title: `${base.title} | ${SITE_NAME}`,
            meta_description: description,
            og: {
                'og:title': base.title, 'og:description': description, 'og:url': canonical,
                'og:image': image, 'og:type': base.ogType, 'og:site_name': SITE_NAME, 'og:locale': 'ar_SA',
            },
            twitter_card: { card: 'summary_large_image', title: base.title, description, image },
            json_ld: base.jsonLd(canonical, image),
            breadcrumbs: base.breadcrumbs(canonical),
            robots: 'index,follow',
            sitemap_entry: { loc: canonical, changefreq: base.changefreq, priority: base.priority },
        };
    }
    async loadEntity(type, id) {
        if (type === 'category')
            return { id, is_category: true };
        const col = type === 'medicine' ? 'medicines_master' : type === 'article' ? 'articles' : 'provider_profiles';
        return this.conn.collection(col).findOne({ id }, { projection: { _id: 0 } });
    }
    cdn(u) {
        if (!u)
            return u;
        if (u.startsWith('http'))
            return u;
        return `${process.env.S3_PUBLIC_BASE_URL || 'https://cdn.nabd.plus'}/${u.replace(/^\//, '')}`;
    }
    crumbs(url, items) {
        return {
            '@context': 'https://schema.org', '@type': 'BreadcrumbList',
            itemListElement: items.map(([name, link], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(link ? { item: link } : {}) })),
        };
    }
    baseFields(type, e) {
        switch (type) {
            case 'medicine': {
                const title = e.name_ar || e.name_en || 'منتج';
                const desc = [e.description_ar, e.active_ingredient ? `المادة الفعالة: ${e.active_ingredient}` : null, e.manufacturer ? `من ${e.manufacturer}` : null].filter(Boolean).join(' — ') || `${title} — متوفر في صيدلية ${SITE_NAME}`;
                return {
                    title, description: desc, image: e.image ? this.cdn(e.image) : null, ogType: 'product', changefreq: 'weekly', priority: 0.8,
                    jsonLd: (url, img) => ({
                        '@context': 'https://schema.org', '@type': 'Product', name: title, description: desc, image: img, url,
                        brand: e.manufacturer ? { '@type': 'Brand', name: e.manufacturer } : undefined,
                        offers: e.price ? { '@type': 'Offer', price: e.price, priceCurrency: 'SAR', availability: e.availability_status === 'none' || !e.availability_status ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability' } : undefined,
                    }),
                    breadcrumbs: (url) => this.crumbs(url, [['الرئيسية', SITE], ['الصيدلية', `${SITE}/pharmacy`], [e.category || 'منتجات', null], [title, url]]),
                };
            }
            case 'article':
                return {
                    title: e.title_ar || e.title || 'مقال',
                    description: (e.excerpt_ar || e.content_ar || '').slice(0, 155) || `مقال طبي من ${SITE_NAME}`,
                    image: e.image ? this.cdn(e.image) : null, ogType: 'article', changefreq: 'monthly', priority: 0.6,
                    jsonLd: (url, img) => ({ '@context': 'https://schema.org', '@type': 'Article', headline: e.title_ar || e.title, image: img, url, author: { '@type': 'Organization', name: SITE_NAME } }),
                    breadcrumbs: (url) => this.crumbs(url, [['الرئيسية', SITE], ['المقالات', `${SITE}/articles`], [e.title_ar || 'مقال', url]]),
                };
            case 'category':
                return {
                    title: e.id, description: `تصفح منتجات ${e.id} في صيدلية ${SITE_NAME}`,
                    image: null, ogType: 'website', changefreq: 'weekly', priority: 0.7,
                    jsonLd: (url) => ({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: e.id, url }),
                    breadcrumbs: (url) => this.crumbs(url, [['الرئيسية', SITE], ['الصيدلية', `${SITE}/pharmacy`], [e.id, url]]),
                };
            default: {
                const title = e.name || e.facility_name || e.full_name || 'مزود';
                const desc = [e.specialty, e.city, (e.bio || '').slice(0, 100)].filter(Boolean).join(' — ') || `${title} — مزود رعاية صحية في ${SITE_NAME}`;
                return {
                    title, description: desc, image: e.photo_url || e.logo_url ? this.cdn(e.photo_url || e.logo_url) : null,
                    ogType: 'profile', changefreq: 'weekly', priority: 0.7,
                    jsonLd: (url, img) => ({ '@context': 'https://schema.org', '@type': type === 'doctor' ? 'Physician' : 'MedicalBusiness', name: title, description: desc, image: img, url, ...(e.specialty ? { medicalSpecialty: e.specialty } : {}) }),
                    breadcrumbs: (url) => this.crumbs(url, [['الرئيسية', SITE], ['المزودون', `${SITE}/providers`], [title, url]]),
                };
            }
        }
    }
    async sitemapXml() {
        const meds = await this.conn.collection('medicines_master')
            .find({ is_deleted: { $ne: true } }, { projection: { _id: 0, id: 1, slug: 1, name_ar: 1, updatedAt: 1 } })
            .sort({ usage_count: -1 }).limit(2000).toArray();
        const urls = meds.map((m) => {
            const slug = m.slug || slugify(`${m.name_ar || ''}-${String(m.id).slice(0, 6)}`);
            const lastmod = m.updatedAt ? new Date(m.updatedAt).toISOString().slice(0, 10) : '2026-07-01';
            return `  <url><loc>${SITE}/s/medicine/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
        });
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
    }
    async globalSearch(q, limit = 5) {
        const term = (q || '').trim();
        if (term.length < 2)
            return { query: q, results: {}, total: 0 };
        const rx = { $regex: term, $options: 'i' };
        const medProj = { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, image: 1, category: 1, manufacturer: 1 };
        const docProj = { _id: 0, id: 1, name: 1, full_name: 1, specialty: 1, photo_url: 1, rating: 1, city: 1 };
        const [medicines, doctors, pharmacies, hospitals, labs, services] = await Promise.all([
            this.conn.collection('medicines_master').find({ is_deleted: { $ne: true }, $or: [{ name_ar: rx }, { name_en: rx }, { active_ingredient: rx }, { search_text: rx }] }, { projection: medProj }).limit(limit).toArray(),
            this.conn.collection('provider_profiles').find({ provider_type: 'doctor', $or: [{ name: rx }, { full_name: rx }, { specialty: rx }] }, { projection: docProj }).limit(limit).toArray(),
            this.conn.collection('provider_profiles').find({ provider_type: 'pharmacy', $or: [{ name: rx }, { facility_name: rx }] }, { projection: { _id: 0, id: 1, name: 1, facility_name: 1, city: 1, logo_url: 1 } }).limit(limit).toArray(),
            this.conn.collection('provider_profiles').find({ provider_type: { $in: ['hospital', 'clinic', 'medical_center'] }, $or: [{ name: rx }, { facility_name: rx }] }, { projection: { _id: 0, id: 1, name: 1, facility_name: 1, city: 1 } }).limit(limit).toArray(),
            this.conn.collection('provider_profiles').find({ provider_type: { $in: ['lab', 'laboratory'] }, $or: [{ name: rx }, { facility_name: rx }] }, { projection: { _id: 0, id: 1, name: 1, facility_name: 1, city: 1 } }).limit(limit).toArray(),
            this.conn.collection('homecareservices').find({ $or: [{ name_ar: rx }, { name_en: rx }] }, { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1 } }).limit(limit).toArray().catch(() => []),
        ]);
        const total = medicines.length + doctors.length + pharmacies.length + hospitals.length + labs.length + (services || []).length;
        const norm = term.toLowerCase();
        const rank = (getNames, popField = 'usage_count') => (a, b) => {
            const score = (x) => {
                const names = getNames(x).map((n) => (n || '').toLowerCase());
                if (names.some(n => n === norm))
                    return 100;
                if (names.some(n => n.startsWith(norm)))
                    return 60;
                if (names.some(n => n.includes(norm)))
                    return 30;
                return 0;
            };
            return (score(b) + (b[popField] || 0) / 100) - (score(a) + (a[popField] || 0) / 100);
        };
        const looksIngredient = medicines.length > 0 && medicines.some((m) => (m.active_ingredient || '').toLowerCase().includes(norm));
        const intent = looksIngredient ? 'medicine'
            : doctors.length > 0 && doctors.some((d) => (d.specialty || '').toLowerCase().includes(norm)) ? 'doctor'
                : 'general';
        return {
            query: term, total,
            intent,
            results: {
                medicines: medicines.sort(rank((m) => [m.name_ar, m.name_en, m.active_ingredient])).map((m) => ({ ...m, _type: 'medicine' })),
                doctors: doctors.sort(rank((d) => [d.name, d.full_name, d.specialty], 'rating')).map((d) => ({ ...d, _type: 'doctor' })),
                pharmacies: pharmacies.sort(rank((p) => [p.name, p.facility_name])).map((p) => ({ ...p, _type: 'pharmacy' })),
                hospitals: hospitals.map((h) => ({ ...h, _type: 'hospital' })),
                labs: labs.map((l) => ({ ...l, _type: 'laboratory' })),
                services: (services || []).map((s) => ({ ...s, _type: 'service' })),
            },
            boost_order: intent === 'medicine' ? ['medicines', 'pharmacies', 'doctors'] : intent === 'doctor' ? ['doctors', 'hospitals', 'medicines'] : ['medicines', 'doctors', 'pharmacies'],
        };
    }
    async medicineRecommendations(id, limit = 12) {
        const med = await this.conn.collection('medicines_master').findOne({ id, is_deleted: { $ne: true } }, { projection: { _id: 0 } });
        if (!med)
            return { strategy: 'none', items: [] };
        const card = { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, old_price: 1, image: 1, manufacturer: 1, brand: 1, requires_prescription: 1, form: 1, strength: 1, active_ingredient: 1, category: 1, sub_category: 1, usage_count: 1, availability_status: 1 };
        const score = new Map();
        const add = (item, points, reason) => {
            if (!item?.id || item.id === id)
                return;
            const cur = score.get(item.id) || { item, score: 0, reasons: [] };
            cur.score += points;
            if (!cur.reasons.includes(reason))
                cur.reasons.push(reason);
            score.set(item.id, cur);
        };
        const queries = [];
        if (med.active_ingredient) {
            queries.push(this.conn.collection('medicines_master').find({ active_ingredient: med.active_ingredient, is_deleted: { $ne: true } }, { projection: card }).limit(20).toArray()
                .then(rows => rows.forEach(r => add(r, 50, 'نفس المادة الفعالة'))));
        }
        if (med.active_ingredient && med.strength) {
            queries.push(this.conn.collection('medicines_master').find({ active_ingredient: med.active_ingredient, strength: med.strength, is_deleted: { $ne: true } }, { projection: card }).limit(10).toArray()
                .then(rows => rows.forEach(r => add(r, 15, 'نفس التركيز'))));
        }
        queries.push(this.conn.collection('medicines_master').find({ category: med.category, sub_category: med.sub_category, is_deleted: { $ne: true } }, { projection: card }).limit(20).toArray()
            .then(rows => rows.forEach(r => add(r, med.active_ingredient ? 10 : 30, 'نفس الفئة والاستخدام'))));
        const brand = med.brand || med.manufacturer;
        if (brand) {
            queries.push(this.conn.collection('medicines_master').find({ $or: [{ brand }, { manufacturer: brand }], is_deleted: { $ne: true } }, { projection: card }).limit(15).toArray()
                .then(rows => rows.forEach(r => add(r, 8, 'نفس البراند'))));
        }
        queries.push(this.conn.collection('medicines_master').find({ category: med.category, is_deleted: { $ne: true } }, { projection: card }).sort({ usage_count: -1 }).limit(10).toArray()
            .then(rows => rows.forEach(r => add(r, Math.min(12, (r.usage_count || 0) / 10), 'الأكثر رواجاً'))));
        await Promise.all(queries);
        const items = [...score.values()]
            .map(s => ({ ...s.item, recommend_score: Math.round(s.score), recommend_reasons: s.reasons }))
            .sort((a, b) => b.recommend_score - a.recommend_score)
            .slice(0, limit);
        const strategy = med.active_ingredient
            ? 'ingredient>strength>category>brand>popularity'
            : 'category>usage>brand>popularity';
        return { strategy, items, ai_rank_ready: true };
    }
    async doctorRecommendations(id, limit = 10) {
        const doc = await this.conn.collection('provider_profiles').findOne({ id, provider_type: 'doctor' }, { projection: { _id: 0 } });
        if (!doc)
            return { same_specialty: [], nearby: [] };
        const card = { _id: 0, id: 1, name: 1, full_name: 1, specialty: 1, photo_url: 1, rating: 1, city: 1, consultation_price: 1 };
        const [sameSpecialty, nearby] = await Promise.all([
            doc.specialty
                ? this.conn.collection('provider_profiles').find({ provider_type: 'doctor', specialty: doc.specialty, id: { $ne: id } }, { projection: card }).sort({ rating: -1 }).limit(limit).toArray()
                : Promise.resolve([]),
            doc.city
                ? this.conn.collection('provider_profiles').find({ provider_type: 'doctor', city: doc.city, id: { $ne: id } }, { projection: card }).sort({ rating: -1 }).limit(limit).toArray()
                : Promise.resolve([]),
        ]);
        return { same_specialty: sameSpecialty, nearby, ranking: 'specialty>nearby>rating (AI-rank ready)' };
    }
};
exports.SeoSearchService = SeoSearchService;
exports.SeoSearchService = SeoSearchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], SeoSearchService);
let SeoSearchController = class SeoSearchController {
    constructor(svc) {
        this.svc = svc;
    }
    async sitemap(res) {
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(await this.svc.sitemapXml());
    }
    robots(res) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(`User-agent: *\nAllow: /s/\nAllow: /sitemap.xml\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);
    }
    organization() {
        return {
            '@context': 'https://schema.org', '@type': 'Organization', name: 'نبض', url: SITE,
            logo: `${SITE}/logo.png`,
            sameAs: [],
            contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', availableLanguage: ['ar', 'en'] }],
        };
    }
    localBusiness() {
        return {
            '@context': 'https://schema.org', '@type': 'MedicalBusiness', name: 'صيدلية نبض', url: SITE,
            areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
            availableService: [
                { '@type': 'MedicalTherapy', name: 'صيدلية إلكترونية' },
                { '@type': 'MedicalProcedure', name: 'استشارات طبية عن بُعد' },
                { '@type': 'MedicalProcedure', name: 'تحاليل وأشعة منزلية' },
            ],
        };
    }
    faqSchema() {
        return {
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: [
                { '@type': 'Question', name: 'هل الطلب يحتاج وصفة طبية؟', acceptedAnswer: { '@type': 'Answer', text: 'الأدوية المميزة بشارة RX فقط تتطلب رفع روشتة قبل إتمام الدفع.' } },
                { '@type': 'Question', name: 'هل يمكن الطلب كضيف؟', acceptedAnswer: { '@type': 'Answer', text: 'نعم — التصفح والبحث والطلب والحجز متاحة للضيوف، والتأمين والعائلة يتطلبان حساباً.' } },
                { '@type': 'Question', name: 'كيف تصل الصور والمنتجات؟', acceptedAnswer: { '@type': 'Answer', text: 'صور المنتجات تُقدَّم عبر CDN عالمي، والمنتجات من كتالوج 21,000+ صنف موثق.' } },
                { '@type': 'Question', name: 'ماذا يعني "قد يكون غير متوفر"؟', acceptedAnswer: { '@type': 'Answer', text: 'شارة تحذيرية تظهر بعد اعتماد الإدارة لبلاغ نقص من الصيدليات — المنتج يبقى قابلاً للطلب.' } },
            ],
        };
    }
    seo(type, id) {
        return this.svc.metadata(type, id);
    }
    hreflang(type, id) {
        const canonical = `${SITE}/s/${type}/${id}`;
        return {
            canonical,
            alternates: [
                { hreflang: 'ar', href: canonical },
                { hreflang: 'en', href: `${canonical}?lang=en` },
                { hreflang: 'x-default', href: canonical },
            ],
        };
    }
    llmsTxt(res) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(`# نبض — منصة رعاية صحية رقمية\n\n` +
            `> صيدلية إلكترونية (21,052 منتجاً) + استشارات + تحاليل + أشعة + تمريض منزلي في السعودية.\n\n` +
            `## الكيانات القابلة للفهرسة\n` +
            `- Medicines: ${SITE}/s/medicine/{slug} — تفاصيل كاملة (اسم/مادة/سعر/صور/بدائل/شارات توفر)\n` +
            `- Doctors/Providers: ${SITE}/s/doctor/{slug} — تخصص/مدينة/تقييم\n` +
            `- Categories: ${SITE}/api/v1/medicines/categories — شجرة الفئات مع الأعداد\n\n` +
            `## APIs عامة للاستعلام\n` +
            `- GET ${SITE}/api/v1/medicines — كتالوج (بحث/ترقيم/فلاتر)\n` +
            `- GET ${SITE}/api/v1/medicines/:id/details — تفاصيل منتج كاملة\n` +
            `- GET ${SITE}/api/v1/search/global — بحث موحد\n` +
            `- GET ${SITE}/api/v1/medicines/hot — الأكثر رواجاً\n` +
            `- GET ${SITE}/sitemap.xml — خريطة الموقع\n\n` +
            `## ملاحظات\n` +
            `- المحتوى ثنائي اللغة (العربية أساسياً والإنجليزية ثانوياً) مع ترجمات ur/hi/bn/tl.\n` +
            `- الأسعار بالريال السعودي (SAR).\n`);
    }
    async imageSitemap(res) {
        const meds = await this.svc.conn.collection('medicines_master')
            .find({ is_deleted: { $ne: true }, image: { $ne: null } }, { projection: { _id: 0, id: 1, name_ar: 1, slug: 1, image: 1 } })
            .sort({ usage_count: -1 }).limit(1500).toArray();
        const cdn = (u) => u?.startsWith('http') ? u : `${process.env.S3_PUBLIC_BASE_URL || 'https://cdn.nabd.plus'}/${u}`;
        const urls = meds.map((m) => {
            const slug = m.slug || m.id;
            return `  <url><loc>${SITE}/s/medicine/${slug}</loc><image:image><image:loc>${cdn(m.image)}</image:loc><image:title>${(m.name_ar || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</image:title></image:image></url>`;
        });
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`);
    }
    globalSearch(q, limit) {
        return this.svc.globalSearch(q || '', parseInt(limit || '5'));
    }
    medicineRecommendations(id, limit) {
        return this.svc.medicineRecommendations(id, parseInt(limit || '12'));
    }
    doctorRecommendations(id, limit) {
        return this.svc.doctorRecommendations(id, parseInt(limit || '10'));
    }
};
exports.SeoSearchController = SeoSearchController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('sitemap.xml'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoSearchController.prototype, "sitemap", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('robots.txt'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SeoSearchController.prototype, "robots", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('seo/site/organization'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], SeoSearchController.prototype, "organization", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('seo/site/local-business'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], SeoSearchController.prototype, "localBusiness", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('seo/site/faq'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], SeoSearchController.prototype, "faqSchema", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('seo/:type/:id'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SeoSearchController.prototype, "seo", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('seo/:type/:id/hreflang'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Object)
], SeoSearchController.prototype, "hreflang", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('llms.txt'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SeoSearchController.prototype, "llmsTxt", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('image-sitemap.xml'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoSearchController.prototype, "imageSitemap", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('search/global'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SeoSearchController.prototype, "globalSearch", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('medicines/:id/recommendations'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SeoSearchController.prototype, "medicineRecommendations", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('doctors/:id/recommendations'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SeoSearchController.prototype, "doctorRecommendations", null);
exports.SeoSearchController = SeoSearchController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [SeoSearchService])
], SeoSearchController);
let SeoSearchModule = class SeoSearchModule {
};
exports.SeoSearchModule = SeoSearchModule;
exports.SeoSearchModule = SeoSearchModule = __decorate([
    (0, common_1.Module)({
        controllers: [SeoSearchController],
        providers: [SeoSearchService],
    })
], SeoSearchModule);
//# sourceMappingURL=seo-search.module.js.map