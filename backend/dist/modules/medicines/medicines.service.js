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
var MedicinesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicinesService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const events_1 = require("../../common/events");
const medicine_repository_1 = require("./repositories/medicine.repository");
const redis_service_1 = require("../redis/redis.service");
const catalog_publication_service_1 = require("../events/catalog-publication.service");
const med_i18n_1 = require("./med-i18n");
const product_ranking_service_1 = require("../product-ranking/product-ranking.service");
let MedicinesService = MedicinesService_1 = class MedicinesService {
    constructor(model, events, redis, conn, publication, rankingService) {
        this.model = model;
        this.events = events;
        this.redis = redis;
        this.conn = conn;
        this.publication = publication;
        this.rankingService = rankingService;
        this.logger = new common_1.Logger('MedicinesService');
    }
    get shortageReports() { return this.conn.collection('pharmacy_shortage_reports'); }
    get notifications() { return this.conn.collection('notifications'); }
    get priceHistory() { return this.conn.collection('medicine_price_history'); }
    async refreshPublicProjection(medicine, actorId, reason) {
        const reviewedAt = medicine?.last_reviewed || medicine?.approved_at || medicine?.updatedAt || new Date();
        return this.publication.refresh({
            entityType: 'medicine',
            entityId: medicine.id,
            actorId,
            actorRole: 'admin',
            reason,
            idempotencyKey: `catalog-publication:medicine:${medicine.id}:${reason}:${new Date(reviewedAt).toISOString()}`,
        });
    }
    normalizeSearchText(s) {
        return (s || '')
            .toLowerCase()
            .replace(/[ً-ْٰ]/g, '')
            .replace(/[أإآٱ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/ئ/g, 'ي')
            .replace(/ؤ/g, 'و')
            .replace(/[^\p{L}\p{N} ]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    expandSynonyms(term) {
        const out = new Set([term]);
        const norm = term.toLowerCase();
        for (const [k, vals] of Object.entries(MedicinesService_1.SYNONYMS)) {
            if (norm.includes(k)) {
                vals.forEach(v => out.add(v));
                out.add(k);
            }
            if (vals.some(v => norm.includes(v))) {
                out.add(k);
                vals.forEach(v => out.add(v));
            }
        }
        return [...out];
    }
    tolerantRegex(term) {
        const clean = term.replace(/[.*+?^${}()|[\]\\]/g, '').trim();
        if (clean.length < 3)
            return clean;
        return clean.split('').join('.{0,2}');
    }
    publicCatalogFilter() {
        return {
            is_deleted: { $ne: true },
            public_eligibility: true,
            indexing_eligibility: true,
            medical_review_status: 'approved',
        };
    }
    async publicCatalogFragment(locale, category) {
        if (!med_i18n_1.PUBLIC_CATALOG_LOCALES.includes(locale))
            throw new common_1.BadRequestException('unsupported_catalog_locale');
        const normalizedCategory = String(category || '').trim();
        if (!/^[a-z0-9_-]{1,80}$/i.test(normalizedCategory))
            throw new common_1.BadRequestException('invalid_catalog_category');
        const dbLocale = locale === 'fil' ? 'tl' : locale;
        const rows = await this.model.find({ ...this.publicCatalogFilter(), category: normalizedCategory }, MedicinesService_1.CARD_PROJECTION).sort({ name_ar: 1, id: 1 }).limit(500);
        return rows.map((row) => {
            const raw = row?.toObject ? row.toObject() : row;
            const localized = (0, med_i18n_1.localizeMedicineStructured)(raw, dbLocale);
            const translatedName = dbLocale === 'ar'
                ? localized.name_ar
                : dbLocale === 'en'
                    ? (localized.name_en || localized.name_ar)
                    : (raw?.translations?.[dbLocale]?.name || localized.name_en || localized.name_ar);
            return {
                id: localized.id,
                slug: localized.slug || null,
                name: translatedName || null,
                category: localized.category || null,
                form: localized.form || null,
                strength: localized.strength || null,
                price: Number(localized.price || 0),
                image: localized.image || null,
                requires_prescription: localized.requires_prescription === true,
                availability_status: localized.availability_status || 'none',
            };
        });
    }
    buildQuery(search, category, includeUnverified = true) {
        const q = includeUnverified ? { is_deleted: { $ne: true } } : this.publicCatalogFilter();
        if (search) {
            const norm = this.normalizeSearchText(search);
            const ors = [
                { name_ar: { $regex: search, $options: 'i' } },
                { name_en: { $regex: search, $options: 'i' } },
                { active_ingredient: { $regex: search, $options: 'i' } },
                { generic_name: { $regex: search, $options: 'i' } },
                { barcode: { $regex: `^${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
                { manufacturer: { $regex: search, $options: 'i' } },
            ];
            if (norm) {
                ors.unshift({ search_text: { $regex: `^${norm.replace(/[.*+?^${}()|[\]\\]/g, '')}` } });
                ors.push({ search_text: { $regex: norm, $options: 'i' } });
            }
            for (const syn of this.expandSynonyms(search).slice(0, 4)) {
                if (syn !== search)
                    ors.push({ name_en: { $regex: syn, $options: 'i' } }, { name_ar: { $regex: syn, $options: 'i' } }, { search_text: { $regex: this.normalizeSearchText(syn), $options: 'i' } });
            }
            q.$or = ors;
        }
        if (category)
            q.category = category;
        if (!includeUnverified)
            q.verified = true;
        return q;
    }
    trackSearch(term, resultsCount, userId) {
        const t = (term || '').trim();
        if (!t || t.length < 2)
            return;
        this.conn.collection('search_queries').insertOne({
            term: t,
            term_lc: t.toLowerCase(),
            user_id: userId || null,
            results_count: resultsCount,
            createdAt: new Date(),
        }).catch(() => { });
    }
    async didYouMean(term) {
        const t = (term || '').trim().toLowerCase();
        if (t.length < 3)
            return { suggestion: null };
        const lev = (a, b) => {
            const m = a.length, n = b.length;
            if (!m)
                return n;
            if (!n)
                return m;
            const dp = Array.from({ length: n + 1 }, (_, j) => j);
            for (let i = 1; i <= m; i++) {
                let prev = dp[0];
                dp[0] = i;
                for (let j = 1; j <= n; j++) {
                    const tmp = dp[j];
                    dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
                    prev = tmp;
                }
            }
            return dp[n];
        };
        const [terms, names] = await Promise.all([
            this.conn.collection('search_queries').aggregate([
                { $group: { _id: '$term_lc', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 300 },
            ]).toArray(),
            this.model.find({ is_deleted: { $ne: true }, usage_count: { $gt: 0 } }, { _id: 0, name_en: 1, name_ar: 1 })
                .sort({ usage_count: -1 }).limit(300),
        ]);
        let best = null;
        const consider = (cand) => {
            if (!cand)
                return;
            const c = cand.toLowerCase();
            const d = lev(t, c);
            if (d <= 2 && d > 0 && (!best || d < best.d))
                best = { term: cand, d };
        };
        for (const x of terms)
            consider(x._id);
        for (const x of names) {
            consider(x.name_en);
            consider(x.name_ar);
            const first = (x.name_en || '').split(' ')[0];
            if (first)
                consider(first);
        }
        return {
            suggestion: best ? best.term : null,
            alternatives: best ? [best.term] : [],
            query: term,
        };
    }
    async trendingSearches(limit = 10) {
        const cacheKey = 'med:trending';
        const cached = await this.redis.getJson(cacheKey);
        if (cached)
            return cached;
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const rows = await this.conn.collection('search_queries').aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$term_lc', searches: { $sum: 1 } } },
            { $sort: { searches: -1 } },
            { $limit: limit },
            { $project: { _id: 0, term: '$_id', searches: 1 } },
        ]).toArray();
        await this.redis.setJson(cacheKey, rows, 900);
        return rows;
    }
    async recentlyViewed(userId, limit = 20) {
        if (!userId)
            return [];
        const views = await this.conn.collection('product_views').aggregate([
            { $match: { user_id: userId } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: '$medicine_id', last_viewed: { $first: '$createdAt' }, views: { $sum: 1 } } },
            { $sort: { last_viewed: -1 } },
            { $limit: limit },
        ]).toArray();
        if (!views.length)
            return [];
        const ids = views.map((v) => v._id);
        const meds = await this.model.find({ id: { $in: ids } }, MedicinesService_1.CARD_PROJECTION);
        const byId = new Map(meds.map((m) => [m.id, this.withBadges(m?.toObject ? m.toObject() : m)]));
        return views
            .map((v) => ({ ...(byId.get(v._id) || null), last_viewed: v.last_viewed, view_count: v.views }))
            .filter((x) => x && x.id);
    }
    async recentSearches(userId, limit = 10) {
        if (!userId)
            return [];
        return this.conn.collection('search_queries')
            .find({ user_id: userId }, { projection: { _id: 0, term: 1, createdAt: 1 } })
            .sort({ createdAt: -1 }).limit(limit).toArray();
    }
    withBadges(m) {
        const price = m.price || 0;
        const old = m.old_price || 0;
        const discount_percent = old > price && price > 0 ? Math.round((1 - price / old) * 100) : 0;
        return {
            ...m,
            discount_percent,
            has_discount: discount_percent > 0,
            potentially_unavailable: m.availability_status === 'availability_may_be_limited' || m.availability_status === 'admin_flagged_shortage',
            discontinued: m.availability_status === 'discontinued',
            available: m.availability_status === 'none' || !m.availability_status,
        };
    }
    async list(search, category, includeUnverified = true, maxItems = 500, userId, sort = 'smart_ranking', pharmacyId) {
        const cap = Math.min(Math.max(maxItems || 500, 1), 500);
        const cacheKey = `med:list:governed-v2:${search || ''}:${category || ''}:${includeUnverified}:${cap}:${sort}:${pharmacyId || 'global'}`;
        const cached = await this.redis.getJson(cacheKey);
        if (cached)
            return cached;
        let rows = [];

        if (!search && this.rankingService) {
            const { drugIds } = await this.rankingService.getRankedDrugIds({
                pharmacyId,
                category: (category && category !== 'all') ? category : undefined,
                sort: sort === 'trending' ? 'trending' : 'smart_ranking',
                limit: cap,
            });
            if (drugIds.length > 0) {
                const query = {
                    id: { $in: drugIds },
                    ...(includeUnverified ? { is_deleted: { $ne: true } } : this.publicCatalogFilter()),
                    ...((category && category !== 'all') ? { category } : {}),
                };
                const fetched = await this.model.find(query, MedicinesService_1.CARD_PROJECTION);
                const map = new Map(fetched.map((m) => [m.id, m]));
                rows = drugIds.map((id) => map.get(id)).filter(Boolean);
            }
        }

        if (rows.length === 0 && search && search.trim().length >= 2) {
            try {
                rows = await this.model.find({ $text: { $search: search.trim() }, ...(includeUnverified ? { is_deleted: { $ne: true } } : this.publicCatalogFilter()), ...((category && category !== 'all') ? { category } : {}) }, { ...MedicinesService_1.CARD_PROJECTION, score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).limit(cap);
            }
            catch { }
        }
        if (rows.length < 3) {
            rows = await this.model.find(this.buildQuery(search, (category && category !== 'all') ? category : undefined, includeUnverified), MedicinesService_1.CARD_PROJECTION)
                .sort({ verified: -1, usage_count: -1, name_ar: 1 }).limit(cap);
        }
        if (rows.length === 0 && search && search.trim().length >= 3) {
            const norm = this.normalizeSearchText(search);
            const tolerant = this.tolerantRegex(norm || search);
            rows = await this.model.find({ is_deleted: { $ne: true }, $or: [
                    { name_ar: { $regex: tolerant, $options: 'i' } },
                    { name_en: { $regex: tolerant, $options: 'i' } },
                    { search_text: { $regex: tolerant, $options: 'i' } },
                    { active_ingredient: { $regex: tolerant, $options: 'i' } },
                ] }, MedicinesService_1.CARD_PROJECTION).sort({ usage_count: -1 }).limit(Math.min(cap, 50));
        }

        if (search && rows.length > 0 && this.rankingService) {
            const candidates = rows.map((r) => ({
                drugId: r.id,
                textScore: r.score || (r.verified ? 2.0 : 1.0),
            }));
            const blendedIds = await this.rankingService.blendSearchRelevance(candidates, { pharmacyId, category: (category && category !== 'all') ? category : undefined });
            if (blendedIds.length > 0) {
                const map = new Map(rows.map((r) => [r.id, r]));
                rows = blendedIds.map((id) => map.get(id)).filter(Boolean);
            }
        }

        this.trackSearch(search, rows.length, userId);
        const withBadges = rows.map((m) => this.withBadges(m?.toObject ? m.toObject() : m));
        await this.redis.setJson(cacheKey, withBadges, MedicinesService_1.LIST_CACHE_TTL);
        return withBadges;
    }
    async paginate(search, category, page = 1, limit = 30, includeUnverified = true, sort = 'smart_ranking', pharmacyId) {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const cacheKey = `med:page:governed-v2:${search || ''}:${category || ''}:${includeUnverified}:${safePage}:${safeLimit}:${sort}:${pharmacyId || 'global'}`;
        const cached = await this.redis.getJson(cacheKey);
        if (cached)
            return cached;

        if (!search && this.rankingService) {
            const offset = (safePage - 1) * safeLimit;
            const { drugIds, total } = await this.rankingService.getRankedDrugIds({
                pharmacyId,
                category: (category && category !== 'all') ? category : undefined,
                sort: sort === 'trending' ? 'trending' : 'smart_ranking',
                limit: safeLimit,
                offset,
            });
            if (drugIds.length > 0) {
                const query = {
                    id: { $in: drugIds },
                    ...(includeUnverified ? { is_deleted: { $ne: true } } : this.publicCatalogFilter()),
                    ...((category && category !== 'all') ? { category } : {}),
                };
                const rows = await this.model.find(query, MedicinesService_1.CARD_PROJECTION);
                const map = new Map(rows.map((m) => [m.id, m]));
                const ordered = drugIds.map((id) => map.get(id)).filter(Boolean);
                const result = {
                    data: ordered.map((m) => this.withBadges(m?.toObject ? m.toObject() : m)),
                    total,
                    page: safePage,
                    limit: safeLimit,
                    total_pages: Math.ceil(total / safeLimit),
                };
                await this.redis.setJson(cacheKey, result, MedicinesService_1.LIST_CACHE_TTL);
                return result;
            }
        }

        const q = this.buildQuery(search, (category && category !== 'all') ? category : undefined, includeUnverified);
        const [data, total] = await Promise.all([
            this.model.find(q, MedicinesService_1.CARD_PROJECTION)
                .sort({ verified: -1, usage_count: -1, name_ar: 1 })
                .skip((safePage - 1) * safeLimit).limit(safeLimit),
            this.model.countDocuments ? this.model.countDocuments(q) : Promise.resolve(0),
        ]);
        const result = {
            data: data.map((m) => this.withBadges(m?.toObject ? m.toObject() : m)),
            total, page: safePage, limit: safeLimit, total_pages: Math.ceil(total / safeLimit),
        };
        await this.redis.setJson(cacheKey, result, MedicinesService_1.LIST_CACHE_TTL);
        return result;
    }
    async cursorPage(search, category, cursor, limit = 30) {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const q = this.publicCatalogFilter();
        if (search)
            Object.assign(q, this.buildQuery(search, category, false));
        else if (category)
            q.category = category;
        if (cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
                q.$or = [
                    { name_ar: { $gt: decoded.n } },
                    { name_ar: decoded.n, id: { $gt: decoded.i } },
                ];
            }
            catch { }
        }
        const cacheKey = `med:cursor:governed-v1:${search || ''}:${category || ''}:${cursor || ''}:${safeLimit}`;
        const cached = await this.redis.getJson(cacheKey);
        if (cached)
            return cached;
        const rows = await this.model.find(q, MedicinesService_1.CARD_PROJECTION)
            .sort({ name_ar: 1, id: 1 }).limit(safeLimit + 1);
        const hasMore = rows.length > safeLimit;
        const page = rows.slice(0, safeLimit);
        const last = page[page.length - 1];
        const next_cursor = hasMore && last
            ? Buffer.from(JSON.stringify({ n: last.name_ar, i: last.id }), 'utf8').toString('base64url')
            : null;
        const result = {
            data: page.map((m) => this.withBadges(m?.toObject ? m.toObject() : m)),
            limit: safeLimit,
            has_more: hasMore,
            next_cursor,
        };
        await this.redis.setJson(cacheKey, result, MedicinesService_1.LIST_CACHE_TTL);
        return result;
    }
    get hotCol() { return this.conn.collection('hot_medicines'); }
    async generateHotMedicines() {
        const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);
        const ordersAgg = await this.conn.collection('orders').aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $unwind: '$items' },
            { $group: { _id: '$items.medicine_id', qty: { $sum: { $ifNull: ['$items.qty', 1] } } } },
        ]).toArray();
        const orderScore = new Map(ordersAgg.map((o) => [String(o._id), o.qty]));
        const viewsAgg = await this.conn.collection('product_views').aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$medicine_id', views: { $sum: 1 } } },
        ]).toArray();
        const viewScore = new Map(viewsAgg.map((v) => [String(v._id), v.views]));
        const searchAgg = await this.conn.collection('search_queries').aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$term_lc', n: { $sum: 1 } } },
        ]).toArray();
        const candidates = new Set([...orderScore.keys(), ...viewScore.keys()]);
        const terms = searchAgg.sort((a, b) => b.n - a.n).slice(0, 100);
        const searchScore = new Map();
        for (const t of terms) {
            const term = t._id;
            if (!term || term.length < 3)
                continue;
            const hits = await this.model.find({ $or: [{ name_ar: { $regex: term, $options: 'i' } }, { name_en: { $regex: term, $options: 'i' } }], ...this.publicCatalogFilter() }, { _id: 0, id: 1 }).limit(50);
            for (const h of hits) {
                searchScore.set(h.id, (searchScore.get(h.id) || 0) + t.n);
                candidates.add(h.id);
            }
        }
        const maxOf = (m) => Math.max(1, ...m.values());
        const [mo, ms, mv] = [maxOf(orderScore), maxOf(searchScore), maxOf(viewScore)];
        const scored = [...candidates].map((id) => ({
            id,
            score: (orderScore.get(id) || 0) / mo * 0.5
                + (searchScore.get(id) || 0) / ms * 0.3
                + (viewScore.get(id) || 0) / mv * 0.2,
        })).sort((a, b) => b.score - a.score).slice(0, 50);
        await this.hotCol.deleteMany({});
        for (const s of scored) {
            const med = await this.model.findOne({ id: s.id, ...this.publicCatalogFilter() }, MedicinesService_1.CARD_PROJECTION);
            if (med) {
                await this.hotCol.insertOne({
                    medicine_id: s.id,
                    score: +s.score.toFixed(4),
                    medicine: this.withBadges(med?.toObject ? med.toObject() : med),
                    generated_at: new Date(),
                });
            }
        }
        await this.redis.setJson('med:hot', scored.map((s) => s.id), 90000);
        this.logger?.log?.(`Hot medicines generated: ${scored.length} items`);
        return { generated: scored.length };
    }
    async hot() {
        const cached = await this.redis.getJson('med:hot:governed-v2:live');
        if (cached)
            return cached;

        if (this.rankingService) {
            const { drugIds } = await this.rankingService.getRankedDrugIds({
                pharmacyId: 'global',
                sort: 'trending',
                limit: 50,
            });
            if (drugIds.length > 0) {
                const rows = await this.model.find({ id: { $in: drugIds }, ...this.publicCatalogFilter() }, MedicinesService_1.CARD_PROJECTION);
                const map = new Map(rows.map((r) => [r.id, r]));
                const ordered = drugIds
                    .map((id) => map.get(id))
                    .filter(Boolean)
                    .map((m) => this.withBadges(m?.toObject ? m.toObject() : m));
                if (ordered.length > 0) {
                    await this.redis.setJson('med:hot:governed-v2:live', ordered, 180);
                    return ordered;
                }
            }
        }

        const rows = await this.model.find(this.publicCatalogFilter(), MedicinesService_1.CARD_PROJECTION)
            .sort({ usage_count: -1, verified: -1 }).limit(50);
        const result = rows.map((m) => this.withBadges(m?.toObject ? m.toObject() : m));
        await this.redis.setJson('med:hot:governed-v2:live', result, 180);
        return result;
    }
    async autocomplete(query) {
        const q = (query || '').trim();
        if (q.length < 1)
            return [];
        const cacheKey = `med:autocomplete:governed-v1:${q.toLowerCase()}`;
        const cached = await this.redis.getJson(cacheKey);
        if (cached)
            return cached;
        const re = new RegExp(q, 'i');
        const rows = await this.model.find({ $or: [{ name_ar: re }, { name_en: re }, { active_ingredient: re }], ...this.publicCatalogFilter() }, { _id: 0, id: 1, name_ar: 1, name_en: 1, active_ingredient: 1, image: 1, price: 1, requires_prescription: 1, category: 1 }).sort({ usage_count: -1 }).limit(10);
        await this.redis.setJson(cacheKey, rows, MedicinesService_1.AUTOCOMPLETE_CACHE_TTL);
        return rows;
    }
    async invalidateCache() {
        try {
            const client = this.redis.getClient?.();
            if (client) {
                const keys = await client.keys('med:*');
                if (keys.length)
                    await client.del(...keys);
            }
        }
        catch { }
    }
    extractCodes(raw) {
        if (!raw)
            return [];
        const cleaned = raw.replace(/[\x00-\x1f\x7f]/g, '|');
        const out = new Set();
        out.add(raw);
        out.add(cleaned);
        const gtinMatch = cleaned.match(/^01(\d{14})/);
        if (gtinMatch) {
            const gtin14 = gtinMatch[1];
            out.add(gtin14);
            if (gtin14.startsWith('0'))
                out.add(gtin14.substring(1));
        }
        if (/^\d{12,14}$/.test(raw)) {
            out.add(raw.padStart(14, '0'));
        }
        return Array.from(out);
    }
    async byBarcode(code) {
        const c = (code || '').trim();
        if (!c)
            return { found: false, source: 'none', medicine: null };
        const candidates = this.extractCodes(c);
        const doc = await this.model.findOne({ barcode: { $in: candidates }, ...this.publicCatalogFilter() }, { _id: 0, __v: 0 }).lean();
        if (doc)
            return { found: true, source: 'catalog', medicine: doc, codes_tried: candidates };
        const fuzzy = await this.model.findOne({ $or: [{ name_en: { $regex: c, $options: 'i' } }, { active_ingredient: { $regex: c, $options: 'i' } }], ...this.publicCatalogFilter() }, { _id: 0, __v: 0 }).lean();
        if (fuzzy)
            return { found: true, source: 'fuzzy', medicine: fuzzy, codes_tried: candidates };
        return {
            found: false,
            source: 'none',
            medicine: null,
            codes_tried: candidates,
            ai_lookup_recommended: true,
        };
    }
    async categories() {
        const cacheKey = 'med:categories-governed-v1';
        const cached = await this.redis.getJson(cacheKey);
        if (cached)
            return cached;
        const agg = await this.model.aggregate([
            { $match: this.publicCatalogFilter() },
            { $group: { _id: { cat: '$category', sub: '$sub_category' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);
        const tree = {};
        for (const r of agg) {
            const cat = r._id.cat || 'أخرى';
            if (!tree[cat])
                tree[cat] = { count: 0, subs: {} };
            tree[cat].count += r.count;
            if (r._id.sub)
                tree[cat].subs[r._id.sub] = (tree[cat].subs[r._id.sub] || 0) + r.count;
        }
        const result = Object.entries(tree)
            .map(([slug, v]) => ({
            slug,
            count: v.count,
            sub_categories: Object.entries(v.subs)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 12),
        }))
            .sort((a, b) => b.count - a.count);
        await this.redis.setJson(cacheKey, result, 3600);
        return result;
    }
    async filters() {
        const categories = await this.model.distinct('category', this.publicCatalogFilter());
        const brands = await this.model.distinct('manufacturer', { ...this.publicCatalogFilter(), manufacturer: { $ne: null } });
        const forms = await this.model.distinct('form', { ...this.publicCatalogFilter(), form: { $ne: null } });
        return {
            categories: categories.filter(Boolean),
            brands: brands.filter(Boolean),
            forms: forms.length ? forms.filter(Boolean) : ['أقراص', 'كبسولات', 'شراب', 'حقن', 'كريم / مرهم', 'نقط'],
            sortOptions: ['الأكثر مبيعاً', 'السعر: من الأقل للأعلى', 'السعر: من الأعلى للأقل', 'الأحدث']
        };
    }
    async compare(ids) {
        if (!ids || !ids.length)
            return [];
        return this.model.find({ id: { $in: ids }, ...this.publicCatalogFilter() }, { _id: 0, __v: 0 }).lean();
    }
    async getById(id) {
        const m = await this.model.findOne({ id, is_deleted: { $ne: true } }, { _id: 0, __v: 0 });
        if (!m)
            throw new common_1.NotFoundException();
        return m;
    }
    async getPublicById(id) {
        const m = await this.model.findOne({ id, ...this.publicCatalogFilter() }, { _id: 0, __v: 0 });
        if (!m)
            throw new common_1.NotFoundException();
        return m;
    }
    async details(id, userId, lang) {
        const med = await this.getPublicById(id);
        try {
            this.conn.collection('product_views').insertOne({ medicine_id: id, user_id: userId || null, createdAt: new Date() }).catch(() => { });
            this.model.updateOne({ id }, { $inc: { usage_count: 1 } }).catch(() => { });
        }
        catch { }
        const [alts, stock] = await Promise.all([
            med.active_ingredient
                ? this.model.find({ active_ingredient: med.active_ingredient, id: { $ne: id }, ...this.publicCatalogFilter() }, { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, manufacturer: 1, requires_prescription: 1 }).limit(8)
                : [],
            this.aggregateStock(id),
        ]);
        if (stock.aggregate_stock !== med.aggregate_stock || stock.pharmacies_count !== med.pharmacies_count) {
            this.model.updateOne({ id }, { $set: { aggregate_stock: stock.aggregate_stock, pharmacies_count: stock.pharmacies_count } }).catch(() => { });
        }
        const raw = med.toObject ? med.toObject() : med;
        const gallery = [
            ...(Array.isArray(raw.images) ? raw.images : []),
            raw.image_1, raw.image_2, raw.image_3, raw.image_4, raw.image_5,
            raw.image,
        ].filter((u, i, arr) => typeof u === 'string' && u.length > 4 && arr.indexOf(u) === i);
        const price = raw.price || 0;
        const old = raw.old_price || 0;
        const discount_percent = old > price && price > 0 ? Math.round((1 - price / old) * 100) : 0;
        const localizedRaw = (0, med_i18n_1.localizeMedicineStructured)(raw, lang);
        return {
            ...localizedRaw,
            images: gallery,
            image: gallery[0] || raw.image || null,
            discount_percent,
            has_discount: discount_percent > 0,
            potentially_unavailable: raw.availability_status === 'availability_may_be_limited' || raw.availability_status === 'admin_flagged_shortage',
            discontinued: raw.availability_status === 'discontinued',
            available: raw.availability_status === 'none' || !raw.availability_status,
            alternatives: alts,
            stock_status: stock,
        };
    }
    async aggregateStock(medicine_id) {
        const conn = this.model.db;
        const InvModel = conn.models?.PharmacyInventory || conn.model?.('PharmacyInventory');
        if (!InvModel)
            return { aggregate_stock: 0, pharmacies_count: 0, in_stock: false };
        const agg = await InvModel.aggregate([
            { $match: { medicine_id, is_available: true } },
            { $group: { _id: null, total: { $sum: '$stock_qty' }, n: { $sum: { $cond: [{ $gt: ['$stock_qty', 0] }, 1, 0] } } } },
        ]);
        const row = (agg && agg[0]) || { total: 0, n: 0 };
        return { aggregate_stock: row.total || 0, pharmacies_count: row.n || 0, in_stock: (row.total || 0) > 0 };
    }
    async alternatives(id) {
        const med = await this.getPublicById(id);
        if (!med.active_ingredient)
            return [];
        return this.model.find({ active_ingredient: med.active_ingredient, id: { $ne: id }, ...this.publicCatalogFilter() }, { _id: 0, __v: 0 }).limit(20);
    }
    async createManualEntry(data, byUserId, byRole) {
        const m = await this.model.create({
            ...data,
            verified: false,
            source: byRole,
            created_by_user_id: byUserId,
            created_by_role: byRole,
        });
        this.events.emit(events_1.EVENTS.MEDICINE_PENDING_REVIEW, { medicine_id: m.id, by_role: byRole });
        await this.invalidateCache();
        return m;
    }
    async approve(id, by) {
        const existing = await this.model.findOne({ id, is_deleted: { $ne: true } });
        if (!existing)
            throw new common_1.NotFoundException();
        const translationGaps = (0, med_i18n_1.missingPublicMedicineTranslations)(existing.toObject ? existing.toObject() : existing);
        if (translationGaps.length) {
            throw new common_1.BadRequestException(`public_translation_incomplete:${translationGaps.join(',')}`);
        }
        const reviewedAt = new Date();
        const m = await this.model.findOneAndUpdate({ id }, {
            $set: {
                verified: true,
                approved_by: by,
                approved_at: reviewedAt,
                public_eligibility: true,
                indexing_eligibility: false,
                medical_review_status: 'approved',
                last_reviewed: reviewedAt,
                provenance: 'admin_medicine_review',
            },
        }, { new: true, projection: { _id: 0, __v: 0 } });
        if (!m)
            throw new common_1.NotFoundException();
        this.events.emit(events_1.EVENTS.MEDICINE_APPROVED, { medicine_id: id, by });
        await this.refreshPublicProjection(m, by, 'medicine_approved');
        await this.invalidateCache();
        return m;
    }
    async reject(id, by, reason) {
        const reviewedAt = new Date();
        const m = await this.model.findOneAndUpdate({ id }, {
            $set: {
                rejected_reason: reason,
                verified: false,
                public_eligibility: false,
                indexing_eligibility: false,
                medical_review_status: 'rejected',
                last_reviewed: reviewedAt,
                provenance: 'admin_medicine_review',
            },
        }, { new: true, projection: { _id: 0, __v: 0 } });
        if (!m)
            throw new common_1.NotFoundException();
        this.events.emit(events_1.EVENTS.MEDICINE_REJECTED, { medicine_id: id, by, reason });
        await this.refreshPublicProjection(m, by, 'medicine_rejected');
        await this.invalidateCache();
        return m;
    }
    async update(id, data) {
        if (data.image) {
            const old = await this.model.findOne({ id });
            if (old?.image && old.image !== data.image) {
                this.events.emit('storage.delete_by_url', { url: old.image });
            }
        }
        const m = await this.model.findOneAndUpdate({ id }, { $set: data }, { new: true, projection: { _id: 0, __v: 0 } });
        await this.invalidateCache();
        return m;
    }
    async pendingReview() {
        return this.model.find({ verified: false, source: { $ne: 'master' } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
    }
    async createCatalog(data, byUserId) {
        const m = await this.model.create({
            ...data,
            verified: true,
            public_eligibility: false,
            indexing_eligibility: false,
            medical_review_status: 'pending',
            provenance: 'admin_catalog_draft',
            source: 'admin',
            created_by_user_id: byUserId,
            created_by_role: 'admin',
            approved_by: byUserId,
            approved_at: new Date()
        });
        this.events.emit(events_1.EVENTS.MEDICINE_APPROVED, { medicine_id: m.id, by: byUserId });
        await this.invalidateCache();
        return m;
    }
    async reportShortage(medicineId, reporter, body) {
        const med = await this.getById(medicineId);
        if (!med)
            throw new common_1.NotFoundException('Medicine not found');
        const dup = await this.shortageReports.findOne({ medicine_id: medicineId, reporter_id: reporter.id, status: 'pending' });
        if (dup)
            return { ok: true, report_id: dup.id, note: 'already_reported' };
        const reportId = `shr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await this.shortageReports.insertOne({
            id: reportId,
            medicine_id: medicineId,
            medicine_name: med.name_ar || med.name_en,
            reporter_id: reporter.id,
            reporter_role: reporter.role,
            note: body?.note || null,
            quantity_available: body?.quantity_available ?? null,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await this.notifications.insertOne({
            id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: 'admin',
            title_key: 'بلاغ نقص دواء جديد',
            body_key: `تم الإبلاغ عن نقص في: ${med.name_ar || med.name_en}`,
            type: 'alert',
            priority: 'high',
            data: { screen: '/admin/shortage-reports', report_id: reportId, medicine_id: medicineId },
            is_read: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        this.audit('medicine.shortage_reported', reportId, reporter.id, reporter.role, { medicine_id: medicineId });
        return { ok: true, report_id: reportId, status: 'pending' };
    }
    async listShortageReports(status = 'pending', page = 1, limit = 20) {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const filter = status === 'all' ? {} : { status };
        const [rows, total] = await Promise.all([
            this.shortageReports.find(filter, { projection: { _id: 0 } })
                .sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).toArray(),
            this.shortageReports.countDocuments(filter),
        ]);
        const counts = await this.shortageReports.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray();
        const by_status = {};
        for (const c of counts)
            by_status[c._id] = c.n;
        return { data: rows, total, page: safePage, total_pages: Math.ceil(total / safeLimit), counts: by_status };
    }
    async approveShortageReport(reportId, adminId) {
        const report = await this.shortageReports.findOne({ id: reportId });
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        if (report.status !== 'pending')
            throw new common_1.BadRequestException(`Report already ${report.status}`);
        await this.model.updateOne({ id: report.medicine_id }, { $set: { availability_status: 'availability_may_be_limited', shortage_notes: report.note || null, updatedAt: new Date() } });
        await this.shortageReports.updateOne({ id: reportId }, { $set: { status: 'approved', reviewed_by: adminId, reviewed_at: new Date(), updatedAt: new Date() } });
        await this.shortageReports.updateMany({ medicine_id: report.medicine_id, status: 'pending', id: { $ne: reportId } }, { $set: { status: 'superseded', updatedAt: new Date() } });
        this.audit('medicine.shortage_approved', reportId, adminId, 'admin', { medicine_id: report.medicine_id });
        await this.invalidateCache();
        return { ok: true, badge: 'availability_may_be_limited' };
    }
    async rejectShortageReport(reportId, adminId, reason) {
        const report = await this.shortageReports.findOne({ id: reportId });
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        if (report.status !== 'pending')
            throw new common_1.BadRequestException(`Report already ${report.status}`);
        await this.shortageReports.updateOne({ id: reportId }, { $set: { status: 'rejected', reviewed_by: adminId, reviewed_at: new Date(), rejection_reason: reason || null, updatedAt: new Date() } });
        this.audit('medicine.shortage_rejected', reportId, adminId, 'admin', { medicine_id: report.medicine_id, reason });
        return { ok: true };
    }
    async clearShortageBadge(medicineId, adminId) {
        await this.model.updateOne({ id: medicineId }, { $set: { availability_status: 'none', shortage_notes: null, updatedAt: new Date() } });
        this.audit('medicine.shortage_badge_cleared', medicineId, adminId, 'admin', {});
        await this.invalidateCache();
        return { ok: true };
    }
    async setAvailability(medicineId, adminId, status) {
        const allowed = ['none', 'availability_may_be_limited', 'admin_flagged_shortage', 'discontinued'];
        if (!allowed.includes(status))
            throw new common_1.BadRequestException(`status must be one of: ${allowed.join(', ')}`);
        await this.model.updateOne({ id: medicineId }, { $set: { availability_status: status, updatedAt: new Date() } });
        this.audit('medicine.availability_changed', medicineId, adminId, 'admin', { status });
        await this.invalidateCache();
        return { ok: true, status };
    }
    get imageSuggestions() { return this.conn.collection('medicine_image_suggestions'); }
    get storageObjects() { return this.conn.collection('storage_objects'); }
    audit(type, entityId, actorId, actorRole, meta) {
        this.conn.collection('system_events').insertOne({
            type,
            entity_type: type.split('.')[0],
            entity_id: entityId,
            actor_account_id: actorId,
            actor_role: actorRole,
            meta: meta || {},
            createdAt: new Date(),
            updatedAt: new Date(),
        }).catch(() => { });
    }
    async suggestImage(medicineId, reporter, body) {
        const med = await this.getById(medicineId);
        if (!med)
            throw new common_1.NotFoundException('Medicine not found');
        if (!body?.storage_id && !body?.image_url)
            throw new common_1.BadRequestException('storage_id or image_url is required');
        let resolvedUrl = body.image_url || null;
        if (body.storage_id) {
            const obj = await this.storageObjects.findOne({ id: body.storage_id, deleted: { $ne: true } });
            if (!obj)
                throw new common_1.NotFoundException('Uploaded image not found');
            resolvedUrl = obj.external_url || `/api/v1/storage/${obj.id}`;
        }
        if (reporter.id !== 'guest') {
            const dup = await this.imageSuggestions.findOne({ medicine_id: medicineId, suggested_by: reporter.id, status: 'pending' });
            if (dup)
                return { ok: true, suggestion_id: dup.id, note: 'already_pending' };
        }
        const id = `mgi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await this.imageSuggestions.insertOne({
            id,
            medicine_id: medicineId,
            medicine_name: med.name_ar || med.name_en,
            current_image: med.image || null,
            suggested_url: resolvedUrl,
            storage_id: body.storage_id || null,
            suggested_by: reporter.id,
            suggested_by_role: reporter.role,
            note: body?.note || null,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await this.notifications.insertOne({
            id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: 'admin',
            title_key: 'اقتراح صورة دواء جديد',
            body_key: `تم اقتراح صورة للصنف: ${med.name_ar || med.name_en}`,
            type: 'alert',
            priority: 'normal',
            data: { screen: '/admin/image-suggestions', suggestion_id: id, medicine_id: medicineId },
            is_read: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return { ok: true, suggestion_id: id, status: 'pending' };
    }
    async listImageSuggestions(status = 'pending', page = 1, limit = 20) {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const filter = status === 'all' ? {} : { status };
        const [rows, total] = await Promise.all([
            this.imageSuggestions.find(filter, { projection: { _id: 0 } })
                .sort({ createdAt: -1 }).skip((Math.max(page, 1) - 1) * safeLimit).limit(safeLimit).toArray(),
            this.imageSuggestions.countDocuments(filter),
        ]);
        return { data: rows, total, page: Math.max(page, 1), total_pages: Math.ceil(total / safeLimit) };
    }
    async approveImageSuggestion(suggestionId, adminId) {
        const s = await this.imageSuggestions.findOne({ id: suggestionId });
        if (!s)
            throw new common_1.NotFoundException('Suggestion not found');
        if (s.status !== 'pending')
            throw new common_1.BadRequestException(`Suggestion already ${s.status}`);
        const med = await this.getById(s.medicine_id);
        if (!med)
            throw new common_1.NotFoundException('Medicine not found');
        await this.model.updateOne({ id: s.medicine_id }, { $set: { image: s.suggested_url, image_1: s.suggested_url, updatedAt: new Date() } });
        if (med.image && med.image !== s.suggested_url) {
            this.events.emit('storage.delete_by_url', { url: med.image });
        }
        await this.imageSuggestions.updateOne({ id: suggestionId }, { $set: { status: 'approved', reviewed_by: adminId, reviewed_at: new Date(), updatedAt: new Date() } });
        this.audit('medicine.image_approved', suggestionId, adminId, 'admin', { medicine_id: s.medicine_id, new_image: s.suggested_url });
        await this.invalidateCache();
        return { ok: true, medicine_id: s.medicine_id, new_image: s.suggested_url, old_image_deleted: !!med.image };
    }
    async rejectImageSuggestion(suggestionId, adminId, reason) {
        const s = await this.imageSuggestions.findOne({ id: suggestionId });
        if (!s)
            throw new common_1.NotFoundException('Suggestion not found');
        if (s.status !== 'pending')
            throw new common_1.BadRequestException(`Suggestion already ${s.status}`);
        await this.imageSuggestions.updateOne({ id: suggestionId }, { $set: { status: 'rejected', reviewed_by: adminId, reviewed_at: new Date(), rejection_reason: reason || null, updatedAt: new Date() } });
        this.audit('medicine.image_rejected', suggestionId, adminId, 'admin', { medicine_id: s.medicine_id, reason });
        return { ok: true };
    }
    async deleteCatalog(id) {
        const m = await this.model.findOneAndUpdate({ id }, { $set: { is_deleted: true } }, { new: true });
        if (!m)
            throw new common_1.NotFoundException();
        if (m.image)
            this.events.emit('storage.delete_by_url', { url: m.image });
        await this.invalidateCache();
        return { ok: true };
    }
    async bulkImport(rows, byUserId, byRole, autoApprove = false) {
        const created = [];
        const failed = [];
        for (const r of rows) {
            try {
                const name_ar = String(r.name_ar || r['name ar'] || r['اسم عربي'] || '').trim();
                if (!name_ar) {
                    failed.push({ row: r, error: 'missing name_ar' });
                    continue;
                }
                const doc = {
                    name_ar,
                    name_en: String(r.name_en || r['name en'] || r['english name'] || '').trim() || undefined,
                    active_ingredient: String(r.active_ingredient || r['active ingredient'] || r['المادة الفعالة'] || '').trim() || undefined,
                    manufacturer: String(r.manufacturer || r['الشركة'] || '').trim() || undefined,
                    category: String(r.category || 'medications').trim() || 'medications',
                    price: Number(r.price ?? r['السعر'] ?? 0) || 0,
                    description_ar: r.description_ar || undefined,
                    description_en: r.description_en || undefined,
                    requires_prescription: !!(r.requires_prescription === true || String(r.requires_prescription || '').toLowerCase() === 'true' || r['rx'] === '1'),
                    image: r.image || undefined,
                    source: 'bulk_import',
                    created_by_user_id: byUserId,
                    created_by_role: byRole,
                    verified: !!autoApprove,
                    public_eligibility: false,
                    indexing_eligibility: false,
                    medical_review_status: 'pending',
                    provenance: 'bulk_import_pending_review',
                    approved_at: autoApprove ? new Date() : undefined,
                    approved_by: autoApprove ? byUserId : undefined,
                };
                const m = await this.model.findOneAndUpdate({ name_ar: doc.name_ar }, { $setOnInsert: doc }, { upsert: true, new: true, projection: { _id: 0, __v: 0 } });
                created.push(m);
                if (!autoApprove)
                    this.events.emit(events_1.EVENTS.MEDICINE_PENDING_REVIEW, { medicine_id: m.id, by_role: byRole });
            }
            catch (e) {
                failed.push({ row: r, error: e.message });
            }
        }
        await this.invalidateCache();
        return { ok: true, imported: created.length, failed: failed.length, failed_rows: failed.slice(0, 20), needs_review: !autoApprove };
    }
    parseCsv(csv) {
        const lines = csv.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2)
            return [];
        const headers = this.splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
        return lines.slice(1).map((line) => {
            const cells = this.splitCsvLine(line);
            const obj = {};
            headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
            return obj;
        });
    }
    splitCsvLine(line) {
        const out = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"' && line[i + 1] === '"') {
                cur += '"';
                i++;
            }
            else if (c === '"') {
                inQ = !inQ;
            }
            else if (c === ',' && !inQ) {
                out.push(cur);
                cur = '';
            }
            else {
                cur += c;
            }
        }
        out.push(cur);
        return out;
    }
    get changeRequests() { return this.conn.collection('catalog_change_requests'); }
    pickEditable(obj) {
        const out = {};
        for (const f of MedicinesService_1.EDITABLE_FIELDS) {
            if (obj && obj[f] !== undefined)
                out[f] = obj[f];
        }
        return out;
    }
    notifyAdmin(title, body, data) {
        return this.notifications.insertOne({
            id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: 'admin', title_key: title, body_key: body, type: 'alert', priority: 'normal',
            data, is_read: false, createdAt: new Date(), updatedAt: new Date(),
        }).catch(() => { });
    }
    async suggestChange(medicineId, reporter, body) {
        const med = await this.getById(medicineId);
        if (!med)
            throw new common_1.NotFoundException('الصنف غير موجود');
        const type = String(body?.type || '');
        if (!MedicinesService_1.CHANGE_TYPES.includes(type) || type === 'new_item') {
            throw new common_1.BadRequestException(`type must be one of: ${MedicinesService_1.CHANGE_TYPES.filter(t => t !== 'new_item').join(', ')}`);
        }
        const changes = this.pickEditable(body?.changes);
        if (type === 'field_edit' && Object.keys(changes).length === 0) {
            throw new common_1.BadRequestException('changes must include at least one editable field');
        }
        const current = {};
        for (const f of Object.keys(changes))
            current[f] = med[f] ?? null;
        if (reporter.id !== 'guest') {
            const dup = await this.changeRequests.findOne({ medicine_id: medicineId, reporter_id: reporter.id, type, status: 'pending' });
            if (dup)
                return { ok: true, request_id: dup.id, note: 'already_pending' };
        }
        const id = `ccr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await this.changeRequests.insertOne({
            id, type, medicine_id: medicineId,
            medicine_name: med.name_ar || med.name_en,
            changes, current_values: current,
            note: body?.note || null,
            reporter_id: reporter.id, reporter_role: reporter.role,
            status: 'pending', createdAt: new Date(), updatedAt: new Date(),
        });
        await this.notifyAdmin('اقتراح تعديل على صنف', `اقتراح ${type} على: ${med.name_ar || med.name_en}`, { screen: '/admin/catalog-suggestions', request_id: id });
        this.audit('medicine.change_suggested', id, reporter.id, reporter.role, { medicine_id: medicineId, type });
        return { ok: true, request_id: id, status: 'pending' };
    }
    async suggestNewItem(reporter, body) {
        const data = this.pickEditable(body);
        if (!data.name_ar && !data.name_en)
            throw new common_1.BadRequestException('name_ar or name_en is required');
        const id = `ccr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await this.changeRequests.insertOne({
            id, type: 'new_item', medicine_id: null,
            medicine_name: data.name_ar || data.name_en,
            changes: data, current_values: {},
            note: body?.note || null,
            reporter_id: reporter.id, reporter_role: reporter.role,
            status: 'pending', createdAt: new Date(), updatedAt: new Date(),
        });
        await this.notifyAdmin('اقتراح صنف جديد', `اقتراح إضافة: ${data.name_ar || data.name_en}`, { screen: '/admin/catalog-suggestions', request_id: id });
        this.audit('medicine.new_item_suggested', id, reporter.id, reporter.role, { name: data.name_ar || data.name_en });
        return { ok: true, request_id: id, status: 'pending' };
    }
    async listChangeRequests(status = 'pending', type, page = 1, limit = 20) {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const filter = status === 'all' ? {} : { status };
        if (type)
            filter.type = type;
        const [rows, total] = await Promise.all([
            this.changeRequests.find(filter, { projection: { _id: 0 } })
                .sort({ createdAt: -1 }).skip((Math.max(page, 1) - 1) * safeLimit).limit(safeLimit).toArray(),
            this.changeRequests.countDocuments(filter),
        ]);
        return { data: rows, total, page: Math.max(page, 1), total_pages: Math.ceil(total / safeLimit) };
    }
    async approveChangeRequest(requestId, adminId, opts = {}) {
        const r = await this.changeRequests.findOne({ id: requestId });
        if (!r)
            throw new common_1.NotFoundException('Request not found');
        if (r.status !== 'pending')
            throw new common_1.BadRequestException(`Request already ${r.status}`);
        const overrides = this.pickEditable(opts?.overrides);
        let rejectedFields = [];
        let applied = {};
        if (r.type === 'field_edit') {
            let patch = this.pickEditable(r.changes);
            if (Array.isArray(opts?.approved_fields)) {
                const keep = new Set(opts.approved_fields.filter(f => MedicinesService_1.EDITABLE_FIELDS.includes(f)));
                rejectedFields = Object.keys(patch).filter(f => !keep.has(f));
                patch = Object.fromEntries(Object.entries(patch).filter(([f]) => keep.has(f)));
            }
            patch = { ...patch, ...overrides };
            if (Object.keys(patch).length === 0)
                throw new common_1.BadRequestException('Nothing to apply');
            await this.model.updateOne({ id: r.medicine_id }, { $set: { ...patch, updatedAt: new Date() } });
            applied = patch;
        }
        else if (r.type === 'image_remove') {
            const med = await this.getById(r.medicine_id);
            if (med?.image)
                this.events.emit('storage.delete_by_url', { url: med.image });
            await this.model.updateOne({ id: r.medicine_id }, { $set: { image: null, image_1: null, updatedAt: new Date() } });
            applied = { image: null };
        }
        else if (r.type === 'shortage_badge') {
            await this.model.updateOne({ id: r.medicine_id }, { $set: { availability_status: 'admin_flagged_shortage', updatedAt: new Date() } });
            applied = { availability_status: 'admin_flagged_shortage' };
        }
        else if (r.type === 'duplicate_remove') {
            await this.model.updateOne({ id: r.medicine_id }, { $set: { is_deleted: true, updatedAt: new Date() } });
            applied = { is_deleted: true };
        }
        else if (r.type === 'new_item') {
            const data = { ...this.pickEditable(r.changes), ...overrides };
            const created = await this.createCatalog({ ...data, verified: true }, adminId);
            applied = { new_medicine_id: created.id };
        }
        await this.changeRequests.updateOne({ id: requestId }, { $set: { status: rejectedFields.length ? 'partially_approved' : 'approved', reviewed_by: adminId, reviewed_at: new Date(), applied, rejected_fields: rejectedFields, updatedAt: new Date() } });
        this.audit('medicine.change_approved', requestId, adminId, 'admin', { type: r.type, medicine_id: r.medicine_id, applied, rejected_fields: rejectedFields });
        await this.invalidateCache();
        return { ok: true, applied };
    }
    async rejectChangeRequest(requestId, adminId, reason) {
        const r = await this.changeRequests.findOne({ id: requestId });
        if (!r)
            throw new common_1.NotFoundException('Request not found');
        if (r.status !== 'pending')
            throw new common_1.BadRequestException(`Request already ${r.status}`);
        await this.changeRequests.updateOne({ id: requestId }, { $set: { status: 'rejected', reviewed_by: adminId, reviewed_at: new Date(), rejection_reason: reason || null, updatedAt: new Date() } });
        this.audit('medicine.change_rejected', requestId, adminId, 'admin', { type: r.type, medicine_id: r.medicine_id, reason });
        return { ok: true };
    }
    async adminListCatalog(opts) {
        const page = Math.max(1, opts.page || 1);
        const limit = Math.min(100, Math.max(1, opts.limit || 25));
        const filter = {};
        if (opts.category)
            filter.category = opts.category;
        if (opts.q?.trim()) {
            const rx = new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name_ar: rx }, { name_en: rx }, { active_ingredient: rx }, { barcode: rx }, { manufacturer: rx }, { brand: rx }];
        }
        if (opts.includeDeleted) {
            const [res] = await this.model.model.aggregate([
                { $match: filter },
                { $sort: { updatedAt: -1 } },
                { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'n' }] } },
            ]);
            const total = res?.total?.[0]?.n || 0;
            return { data: res?.data || [], total, page, pages: Math.ceil(total / limit) };
        }
        const [items, total] = await Promise.all([
            this.model.find({ ...filter, is_deleted: { $ne: true } }).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            this.model.countDocuments({ ...filter, is_deleted: { $ne: true } }),
        ]);
        return { data: items, total, page, pages: Math.ceil(total / limit) };
    }
    async adminCreateCatalog(body, adminId) {
        const clean = this.pickEditable(body);
        if (!clean.name_ar && !clean.name_en)
            throw new common_1.BadRequestException('name_ar أو name_en مطلوب');
        const id = require('crypto').randomUUID();
        const doc = {
            id,
            ...clean,
            categories: clean.category ? [clean.category, ...(clean.sub_category ? [clean.sub_category] : [])] : [],
            images: Array.isArray(clean.images) ? clean.images : (clean.image ? [clean.image] : []),
            price: Number(clean.price) || 0,
            is_deleted: false,
            deleted_at: null,
            source: 'admin_console',
            verified: true,
            public_eligibility: false,
            indexing_eligibility: false,
            medical_review_status: 'pending',
            provenance: 'admin_catalog_draft',
            usage_count: 0,
            search_text: [clean.name_ar, clean.name_en, clean.active_ingredient, clean.manufacturer, clean.brand].filter(Boolean).join(' ').toLowerCase(),
            created_by: adminId,
            updated_by: adminId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.model.create(doc);
        await this.priceHistory.insertOne({ id: `mph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, medicine_id: id, before_price: null, after_price: doc.price, reason: String(body?.reason || 'إنشاء صنف جديد'), changed_by: adminId, createdAt: new Date() });
        this.audit('medicine.admin_create', id, adminId, 'admin', { after: clean });
        await this.invalidateCache();
        return { ok: true, id };
    }
    async adminSetDeleted(medicineId, deleted, adminId) {
        const med = await this.model.findOne({ id: medicineId, is_deleted: !deleted }, { _id: 0, __v: 0 }).lean();
        if (!med)
            throw new common_1.NotFoundException(deleted ? 'الصنف غير موجود' : 'الصنف غير موجود أو ليس محذوفاً');
        await this.model.updateOne({ id: medicineId, is_deleted: !deleted }, { $set: { is_deleted: deleted, deleted_at: deleted ? new Date() : null, updated_by: adminId, updatedAt: new Date() } });
        this.audit(deleted ? 'medicine.admin_soft_delete' : 'medicine.admin_restore', medicineId, adminId, 'admin', {});
        await this.invalidateCache();
        return { ok: true, is_deleted: deleted };
    }
    async getPriceHistory(medicineId, page = 1, limit = 50) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));
        const [data, total] = await Promise.all([
            this.priceHistory.find({ medicine_id: medicineId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).toArray(),
            this.priceHistory.countDocuments({ medicine_id: medicineId }),
        ]);
        return { data, total, page: safePage, pages: Math.ceil(total / safeLimit) };
    }
    async adminCatalogReports() {
        const db = this.model.db;
        let topSelling = [];
        try {
            topSelling = await db.collection('pharmacy_orders').aggregate([
                { $match: { status: { $nin: ['cancelled', 'rejected'] } } },
                { $unwind: '$items' },
                { $group: { _id: { id: '$items.medicine_id', name: { $ifNull: ['$items.name_ar', '$items.name'] } }, qty: { $sum: { $ifNull: ['$items.quantity', 1] } }, revenue: { $sum: { $ifNull: ['$items.price', 0] } } } },
                { $sort: { qty: -1 } },
                { $limit: 20 },
            ]).toArray();
        }
        catch { }
        const byUsage = await this.model.find({ usage_count: { $gt: 0 }, is_deleted: { $ne: true } }, { id: 1, name_ar: 1, name_en: 1, usage_count: 1, price: 1 }).sort({ usage_count: -1 }).limit(20).lean();
        const mostUnavailable = await db.collection('pharmacy_shortage_reports').aggregate([
            { $group: { _id: '$medicine_id', name: { $last: '$medicine_name' }, reports: { $sum: 1 }, last_report: { $max: '$createdAt' } } },
            { $sort: { reports: -1 } },
            { $limit: 20 },
        ]).toArray();
        return {
            top_selling: topSelling.map((t) => ({ medicine_id: t._id?.id || null, name: t._id?.name || '—', qty: t.qty, revenue: t.revenue })),
            top_by_usage: byUsage.map((m) => ({ medicine_id: m.id, name: m.name_ar || m.name_en, usage_count: m.usage_count, price: m.price })),
            most_unavailable: mostUnavailable.map((r) => ({ medicine_id: r._id, name: r.name || '—', reports: r.reports, last_report: r.last_report })),
            generated_at: new Date(),
        };
    }
    async adminUpdateCatalog(medicineId, patch, adminId) {
        const med = await this.getById(medicineId);
        if (!med)
            throw new common_1.NotFoundException('الصنف غير موجود');
        const clean = this.pickEditable(patch);
        const extra = {};
        if (clean.price !== undefined && Number(clean.price) !== Number(med.price || 0)) {
            const priceReason = String(patch?.reason || '').trim();
            if (priceReason.length < 5)
                throw new common_1.BadRequestException('price_change_reason_required');
        }
        if (patch?.availability_status !== undefined) {
            const allowed = ['none', 'availability_may_be_limited', 'admin_flagged_shortage', 'discontinued'];
            if (!allowed.includes(patch.availability_status))
                throw new common_1.BadRequestException('invalid availability_status');
            extra.availability_status = patch.availability_status;
        }
        if (patch?.image !== undefined)
            extra.image = patch.image;
        if (Object.keys(clean).length === 0 && Object.keys(extra).length === 0) {
            throw new common_1.BadRequestException('patch must include at least one editable field');
        }
        const before = {};
        for (const f of Object.keys({ ...clean, ...extra }))
            before[f] = med[f] ?? null;
        const requiresReapproval = med.public_eligibility === true
            || med.indexing_eligibility === true
            || med.medical_review_status === 'approved';
        const governanceReset = requiresReapproval ? {
            verified: false,
            public_eligibility: false,
            indexing_eligibility: false,
            medical_review_status: 'pending',
            last_reviewed: null,
            provenance: 'admin_direct_edit_pending_review',
        } : {};
        await this.model.updateOne({ id: medicineId }, { $set: { ...clean, ...extra, ...governanceReset, updatedAt: new Date() } });
        if (clean.price !== undefined && Number(clean.price) !== Number(med.price || 0)) {
            await this.priceHistory.insertOne({ id: `mph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, medicine_id: medicineId, before_price: Number(med.price || 0), after_price: Number(clean.price), reason: String(patch.reason).trim(), changed_by: adminId, createdAt: new Date() });
        }
        const after = { ...clean, ...extra };
        const collectImgs = (doc) => {
            if (!doc)
                return [];
            const out = [];
            if (Array.isArray(doc.images))
                out.push(...doc.images.filter(Boolean));
            for (const k of ['image', 'image_1', 'image_2', 'image_3', 'image_4', 'image_5'])
                if (doc[k])
                    out.push(doc[k]);
            return [...new Set(out)];
        };
        const merged = { ...med, ...after };
        const removed = collectImgs(med).filter(u => !collectImgs(merged).includes(u));
        for (const url of removed)
            this.events.emit('storage.delete_by_url', { url });
        if (requiresReapproval) {
            await this.refreshPublicProjection({ ...med, ...after, ...governanceReset }, adminId, 'medicine_admin_edit_reapproval');
        }
        this.audit('medicine.admin_direct_edit', medicineId, adminId, 'admin', { before, after, requires_reapproval: requiresReapproval, images_deleted: removed });
        await this.invalidateCache();
        return { ok: true, updated: Object.keys({ ...clean, ...extra }), requires_reapproval: requiresReapproval };
    }
};
exports.MedicinesService = MedicinesService;
MedicinesService.LIST_CACHE_TTL = 300;
MedicinesService.AUTOCOMPLETE_CACHE_TTL = 60;
MedicinesService.SYNONYMS = {
    'باراسيتامول': ['paracetamol', 'acetaminophen'],
    'بنادول': ['panadol'],
    'بانادول': ['panadol'],
    'بروفين': ['ibuprofen', 'brufen'],
    'ايبوبروفين': ['ibuprofen'],
    'اوجمنتين': ['augmentin'],
    'اموكسيسيلين': ['amoxicillin'],
    'ازيثروميسين': ['azithromycin'],
    'فيتامين': ['vitamin'],
    'فوار': ['effervescent'],
    'تحاميل': ['suppository'],
    'شراب': ['syrup'],
    'اقراص': ['tablets'],
    'كريم': ['cream'],
};
MedicinesService.CARD_PROJECTION = {
    _id: 0, __v: 0,
    'translations.ur.more_information': 0, 'translations.ur.indications_uses': 0, 'translations.ur.dosage_instructions': 0, 'translations.ur.side_effects': 0, 'translations.ur.warnings_precautions': 0, 'translations.ur.storage_conditions': 0, 'translations.ur.how_to_use': 0, 'translations.ur.package_content_details': 0,
    'translations.hi.more_information': 0, 'translations.hi.indications_uses': 0, 'translations.hi.dosage_instructions': 0, 'translations.hi.side_effects': 0, 'translations.hi.warnings_precautions': 0, 'translations.hi.storage_conditions': 0, 'translations.hi.how_to_use': 0, 'translations.hi.package_content_details': 0,
    'translations.bn.more_information': 0, 'translations.bn.indications_uses': 0, 'translations.bn.dosage_instructions': 0, 'translations.bn.side_effects': 0, 'translations.bn.warnings_precautions': 0, 'translations.bn.storage_conditions': 0, 'translations.bn.how_to_use': 0, 'translations.bn.package_content_details': 0,
    'translations.tl.more_information': 0, 'translations.tl.indications_uses': 0, 'translations.tl.dosage_instructions': 0, 'translations.tl.side_effects': 0, 'translations.tl.warnings_precautions': 0, 'translations.tl.storage_conditions': 0, 'translations.tl.how_to_use': 0, 'translations.tl.package_content_details': 0,
    more_info_ar: 0, more_info_en: 0, description_ar: 0, description_en: 0,
    indications_ar: 0, indications_en: 0, warnings_ar: 0, warnings_en: 0,
    precautions_ar: 0, precautions_en: 0, side_effects_ar: 0, side_effects_en: 0,
    contraindications_ar: 0, contraindications_en: 0, interactions: 0,
    dosage_ar: 0, dosage_en: 0, usage_instructions_ar: 0, usage_instructions_en: 0,
    storage_conditions_ar: 0, storage_conditions_en: 0, pregnancy_info_ar: 0, pregnancy_info_en: 0,
    breastfeeding_info_ar: 0, breastfeeding_info_en: 0, package_content_details: 0,
    brand_benefits: 0, skin_hair_type: 0, color_shade: 0, drugs_com_link: 0, sfda_link: 0,
    seo_description_ar: 0, seo_description_en: 0,
};
MedicinesService.EDITABLE_FIELDS = [
    'name_ar', 'name_en', 'active_ingredient', 'generic_name', 'manufacturer',
    'category', 'sub_category', 'brand', 'description_ar', 'description_en', 'dosage_ar', 'dosage_en',
    'form', 'strength', 'usage_instructions_ar', 'usage_instructions_en',
    'requires_prescription', 'barcode', 'price', 'images', 'image',
    'indications_ar', 'indications_en', 'contraindications_ar', 'contraindications_en',
    'warnings_ar', 'warnings_en', 'side_effects_ar', 'side_effects_en',
    'precautions_ar', 'precautions_en', 'interactions', 'package_size', 'storage_conditions',
];
MedicinesService.CHANGE_TYPES = ['field_edit', 'image_remove', 'shortage_badge', 'duplicate_remove', 'new_item', 'other'];
__decorate([
    (0, schedule_1.Cron)('0 4 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MedicinesService.prototype, "generateHotMedicines", null);
exports.MedicinesService = MedicinesService = MedicinesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('MedicineRepository')),
    __param(3, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [medicine_repository_1.MedicineRepository,
        event_emitter_1.EventEmitter2,
        redis_service_1.RedisService,
        mongoose_2.Connection,
        catalog_publication_service_1.CatalogPublicationService])
], MedicinesService);
//# sourceMappingURL=medicines.service.js.map