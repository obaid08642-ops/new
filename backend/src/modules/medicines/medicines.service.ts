import { Injectable, NotFoundException, Inject, BadRequestException, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Medicine, MedicineDocument } from '../../schemas/medicine.schema';
import { EVENTS } from '../../common/events';
import { MedicineRepository } from "./repositories/medicine.repository";
import { RedisService } from '../redis/redis.service';
import { CatalogPublicationService } from '../events/catalog-publication.service';
import { AutoEntitySeoPipelineService } from '../events/auto-entity-seo-pipeline.service';
import { localizeMedicineStructured, DbLang, missingPublicMedicineTranslations, PUBLIC_CATALOG_LOCALES } from './med-i18n';
import { ProductRankingService } from '../product-ranking/product-ranking.service';

@Injectable()
export class MedicinesService {
  /** Search/list cache TTL — medicine catalog changes are rare, reads are hot. */
  private static readonly LIST_CACHE_TTL = 300; // 5 minutes
  private static readonly AUTOCOMPLETE_CACHE_TTL = 60; // 1 minute
  private readonly logger = new Logger('MedicinesService');

  constructor(
    @Inject('MedicineRepository') private model: MedicineRepository,
    private events: EventEmitter2,
    private redis: RedisService,
    @InjectConnection() private readonly conn: Connection,
    private readonly publication: CatalogPublicationService,
    @Optional() private readonly seoPipeline?: AutoEntitySeoPipelineService,
    @Optional() private readonly rankingService?: ProductRankingService,
  ) {}

  private get shortageReports() { return this.conn.collection('pharmacy_shortage_reports'); }
  private get notifications() { return this.conn.collection('notifications'); }
  private get priceHistory() { return this.conn.collection('medicine_price_history'); }

  private async refreshPublicProjection(medicine: any, actorId: string, reason: string) {
    const reviewedAt = medicine?.last_reviewed || medicine?.approved_at || medicine?.updatedAt || new Date();
    if (this.seoPipeline) {
      await this.seoPipeline.processEntity({
        entityType: 'medicine',
        entityId: medicine.id,
        actorId,
        reason,
        action: medicine.is_deleted ? 'delete' : (medicine.active === false ? 'deactivate' : 'update'),
      }).catch(() => {});
    }

    return this.publication.refresh({
      entityType: 'medicine',
      entityId: medicine.id,
      actorId,
      actorRole: 'admin',
      reason,
      idempotencyKey: `catalog-publication:medicine:${medicine.id}:${reason}:${new Date(reviewedAt).toISOString()}`,
    });
  }

  // ── Arabic/English search normalization (typo-tolerance foundation) ───────
  // Unifies hamza forms (أ إ آ → ا), taa marbuta (ة → ه), alef maqsura (ى → ي),
  // strips diacritics, lowercases English — so بنادول/بانادول/بنادل all match.
  private normalizeSearchText(s: string): string {
    return (s || '')
      .toLowerCase()
      .replace(/[ً-ْٰ]/g, '') // tashkeel
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ئ/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/[^\p{L}\p{N} ]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Common Arabic↔English pharma synonyms — query expansion. */
  private static readonly SYNONYMS: Record<string, string[]> = {
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

  private expandSynonyms(term: string): string[] {
    const out = new Set<string>([term]);
    const norm = term.toLowerCase();
    for (const [k, vals] of Object.entries(MedicinesService.SYNONYMS)) {
      if (norm.includes(k)) { vals.forEach(v => out.add(v)); out.add(k); }
      if (vals.some(v => norm.includes(v))) { out.add(k); vals.forEach(v => out.add(v)); }
    }
    return [...out];
  }

  /** Typo-tolerant regex: letters joined by ≤2 arbitrary chars (catches dropped/added letters). */
  private tolerantRegex(term: string): string {
    const clean = term.replace(/[.*+?^${}()|[\]\\]/g, '').trim();
    if (clean.length < 3) return clean;
    return clean.split('').join('.{0,2}'); // MongoDB-PCRE safe (no \p classes)
  }

  /** Public catalog gate. Missing governance metadata is intentionally hidden. */
  private publicCatalogFilter() {
    return {
      is_deleted: { $ne: true },
      public_eligibility: true,
      indexing_eligibility: true,
      medical_review_status: 'approved',
    };
  }

  /** Static-catalog payload for a locale/category shard. This is deliberately
   * sourced from governed medicine records rather than a seed or client input. */
  async publicCatalogFragment(locale: string, category: string) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new BadRequestException('unsupported_catalog_locale');
    const normalizedCategory = String(category || '').trim();
    if (!/^[a-z0-9_-]{1,80}$/i.test(normalizedCategory)) throw new BadRequestException('invalid_catalog_category');
    const dbLocale: DbLang = locale === 'fil' ? 'tl' : locale as DbLang;
    const rows: any[] = await this.model.find(
      { ...this.publicCatalogFilter(), category: normalizedCategory },
      MedicinesService.CARD_PROJECTION,
    ).sort({ name_ar: 1, id: 1 }).limit(500);
    return rows.map((row: any) => {
      const raw = row?.toObject ? row.toObject() : row;
      const localized = localizeMedicineStructured(raw, dbLocale);
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

  private buildQuery(search?: string, category?: string, includeUnverified = true) {
    const q: any = includeUnverified ? { is_deleted: { $ne: true } } : this.publicCatalogFilter();
    if (search) {
      const norm = this.normalizeSearchText(search);
      const ors: any[] = [
        { name_ar: { $regex: search, $options: 'i' } },
        { name_en: { $regex: search, $options: 'i' } },
        { active_ingredient: { $regex: search, $options: 'i' } },
        { generic_name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: `^${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }, // barcode prefix match
        { manufacturer: { $regex: search, $options: 'i' } },
      ];
      // Normalized search_text (hamza/taa/alef-insensitive) + synonym expansion.
      // search_text is stored lowercase-normalized, so a CASE-SENSITIVE prefix
      // regex (^norm) uses the btree index — the fast path for most queries.
      if (norm) {
        ors.unshift({ search_text: { $regex: `^${norm.replace(/[.*+?^${}()|[\]\\]/g, '')}` } });
        ors.push({ search_text: { $regex: norm, $options: 'i' } });
      }
      for (const syn of this.expandSynonyms(search).slice(0, 4)) {
        if (syn !== search) ors.push({ name_en: { $regex: syn, $options: 'i' } }, { name_ar: { $regex: syn, $options: 'i' } }, { search_text: { $regex: this.normalizeSearchText(syn), $options: 'i' } });
      }
      q.$or = ors;
    }
    if (category && category !== 'all' && category !== 'الكل') {
      const CANONICAL_MAP: Record<string, string> = {
        'medications': 'الأدوية والعلاج',
        'medicines': 'الأدوية والعلاج',
        'أدوية': 'الأدوية والعلاج',
        'ادوية': 'الأدوية والعلاج',
        'أدوية وعلاجات': 'الأدوية والعلاج',
        'ادوية وعلاجات': 'الأدوية والعلاج',
        'الأدوية والعلاج': 'الأدوية والعلاج',
        'hair-care': 'العناية بالشعر',
        'عناية بالشعر': 'العناية بالشعر',
        'العناية بالشعر': 'العناية بالشعر',
        'cosmetics': 'المكياج والإكسسوارات',
        'makeup': 'المكياج والإكسسوارات',
        'مكياج وإكسسوارات': 'المكياج والإكسسوارات',
        'مكياج واكسسوارات': 'المكياج والإكسسوارات',
        'المكياج والإكسسوارات': 'المكياج والإكسسوارات',
        'skincare': 'العناية بالبشرة',
        'skin-care': 'العناية بالبشرة',
        'عناية بالبشرة': 'العناية بالبشرة',
        'العناية بالبشرة': 'العناية بالبشرة',
        'baby': 'الأم والطفل',
        'baby-care': 'الأم والطفل',
        'الأم والطفل': 'الأم والطفل',
        'الام والطفل': 'الأم والطفل',
        'vitamins': 'الفيتامينات والتغذية الصحية',
        'فيتامينات': 'الفيتامينات والتغذية الصحية',
        'فيتامينات ومكملات': 'الفيتامينات والتغذية الصحية',
        'الفيتامينات والتغذية الصحية': 'الفيتامينات والتغذية الصحية',
        'personal-care': 'العناية الشخصية',
        'عناية شخصية': 'العناية الشخصية',
        'العناية الشخصية': 'العناية الشخصية',
        'home-health': 'الرعاية الصحية المنزلية والأجهزة الطبية',
        'رعاية منزلية': 'الرعاية الصحية المنزلية والأجهزة الطبية',
        'الرعاية الصحية المنزلية والأجهزة الطبية': 'الرعاية الصحية المنزلية والأجهزة الطبية',
      };
      const resolved = CANONICAL_MAP[category.toLowerCase()] || CANONICAL_MAP[category] || category;
      const cleanTerm = resolved.replace(/^ال/, '').trim();
      const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (q.$or) {
        q.$and = [{ $or: q.$or }, { $or: [{ category: resolved }, { category: { $regex: escaped, $options: 'i' } }] }];
        delete q.$or;
      } else {
        q.$or = [{ category: resolved }, { category: { $regex: escaped, $options: 'i' } }];
      }
    }
    if (!includeUnverified) q.verified = true;
    return q;
  }

  /** Track every search for analytics (top-searched terms/medicines) — fire & forget. */
  private trackSearch(term: string | undefined, resultsCount: number, userId?: string) {
    const t = (term || '').trim();
    if (!t || t.length < 2) return;
    this.conn.collection('search_queries').insertOne({
      term: t,
      term_lc: t.toLowerCase(),
      user_id: userId || null,
      results_count: resultsCount,
      createdAt: new Date(),
    }).catch(() => { /* analytics must never slow search */ });
  }

  /**
   * "Did you mean?" — when a search yields zero results, suggest the closest
   * known term (Levenshtein ≤ 2 over recent search terms + sample product names).
   */
  async didYouMean(term: string) {
    const t = (term || '').trim().toLowerCase();
    if (t.length < 3) return { suggestion: null };

    const lev = (a: string, b: string): number => {
      const m = a.length, n = b.length;
      if (!m) return n; if (!n) return m;
      const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
      for (let i = 1; i <= m; i++) {
        let prev = dp[0]; dp[0] = i;
        for (let j = 1; j <= n; j++) {
          const tmp = dp[j];
          dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
          prev = tmp;
        }
      }
      return dp[n];
    };

    // Candidate pool: frequent past search terms + top product names
    const [terms, names] = await Promise.all([
      this.conn.collection('search_queries').aggregate([
        { $group: { _id: '$term_lc', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 300 },
      ]).toArray(),
      this.model.find({ is_deleted: { $ne: true }, usage_count: { $gt: 0 } }, { _id: 0, name_en: 1, name_ar: 1 } as any)
        .sort({ usage_count: -1 }).limit(300),
    ]);

    let best: { term: string; d: number } | null = null;
    const consider = (cand: string) => {
      if (!cand) return;
      const c = cand.toLowerCase();
      const d = lev(t, c);
      if (d <= 2 && d > 0 && (!best || d < best.d)) best = { term: cand, d };
    };
    for (const x of terms) consider(x._id);
    for (const x of names as any[]) {
      consider(x.name_en); consider(x.name_ar);
      const first = (x.name_en || '').split(' ')[0];
      if (first) consider(first);
    }

    return {
      suggestion: best ? best.term : null,
      alternatives: best ? [best.term] : [],
      query: term,
    };
  }

  /** Trending searches (last 7 days) — powers the "trending now" row in apps. */
  async trendingSearches(limit = 10) {
    const cacheKey = 'med:trending';
    const cached = await this.redis.getJson<any[]>(cacheKey);
    if (cached) return cached;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const rows = await this.conn.collection('search_queries').aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$term_lc', searches: { $sum: 1 } } },
      { $sort: { searches: -1 } },
      { $limit: limit },
      { $project: { _id: 0, term: '$_id', searches: 1 } },
    ]).toArray();
    await this.redis.setJson(cacheKey, rows, 900); // 15min
    return rows;
  }

  /** Recently viewed products for the user ("أكمل من حيث توقفت"). */
  async recentlyViewed(userId: string, limit = 20): Promise<any[]> {
    if (!userId) return [];
    const views = await this.conn.collection('product_views').aggregate([
      { $match: { user_id: userId } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$medicine_id', last_viewed: { $first: '$createdAt' }, views: { $sum: 1 } } },
      { $sort: { last_viewed: -1 } },
      { $limit: limit },
    ]).toArray();
    if (!views.length) return [];
    const ids = views.map((v: any) => v._id);
    const meds = await this.model.find({ id: { $in: ids } }, MedicinesService.CARD_PROJECTION);
    const byId = new Map((meds as any[]).map((m: any) => [m.id, this.withBadges(m?.toObject ? m.toObject() : m)]));
    return views
      .map((v: any) => ({ ...(byId.get(v._id) || null), last_viewed: v.last_viewed, view_count: v.views }))
      .filter((x: any) => x && x.id);
  }

  /** Recent searches of a specific user (for the "recent" row). */
  async recentSearches(userId: string, limit = 10): Promise<any[]> {
    if (!userId) return [];
    return this.conn.collection('search_queries')
      .find({ user_id: userId }, { projection: { _id: 0, term: 1, createdAt: 1 } })
      .sort({ createdAt: -1 }).limit(limit).toArray();
  }

  /**
   * Legacy list (array) — Redis-cached, capped at 500 items by default.
   * For large catalogs use paginate() via ?page=&limit= instead.
   */
  /**
   * Card-level projection for LIST responses — the full document (with the
   * 6-language translations map) weighs ~24KB; cards need ~2KB. Details()
   * still returns everything. This is what keeps the catalog fast at 21k docs.
   */
  private static readonly CARD_PROJECTION = {
    _id: 0, __v: 0,
    // Keep ONLY the translated display names per language on cards (needed so
    // ur/hi/bn/tl users see localized names in lists); exclude the heavy
    // translated long-text blocks. details() still returns everything.
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

  /** Compute list badges so catalog rows can render RX/discount/shortage chips. */
  private withBadges(m: any) {
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

  async list(
    search?: string,
    category?: string,
    includeUnverified = true,
    maxItems = 500,
    userId?: string,
    sort = 'smart_ranking',
    pharmacyId?: string,
  ) {
    const cap = Math.min(Math.max(maxItems || 500, 1), 500);
    const cacheKey = `med:list:governed-v2:${search || ''}:${category || ''}:${includeUnverified}:${cap}:${sort}:${pharmacyId || 'global'}`;
    const cached = await this.redis.getJson<any[]>(cacheKey);
    if (cached) return cached;
    let rows: any[] = [];

    // Continuous Dynamic Ranking Fast-Path when viewing storefront without search query
    if (!search && this.rankingService) {
      const { drugIds } = await this.rankingService.getRankedDrugIds({
        pharmacyId,
        category: (category && category !== 'all') ? category : undefined,
        sort: sort === 'trending' ? 'trending' : 'smart_ranking',
        limit: cap,
      });

      if (drugIds.length > 0) {
        const query: any = {
          id: { $in: drugIds },
          ...(includeUnverified ? { is_deleted: { $ne: true } } : this.publicCatalogFilter()),
          ...((category && category !== 'all') ? { category } : {}),
        };
        const fetched = await this.model.find(query, MedicinesService.CARD_PROJECTION);
        const map = new Map(fetched.map((m: any) => [m.id, m]));
        rows = drugIds.map((id) => map.get(id)).filter(Boolean);
      }
    }

    // Fast path: full-text index (medicines_fts) — index-backed, ms-fast on 21k docs
    if (rows.length === 0 && search && search.trim().length >= 2) {
      try {
        rows = await this.model.find(
          { $text: { $search: search.trim() }, ...(includeUnverified ? { is_deleted: { $ne: true } } : this.publicCatalogFilter()), ...((category && category !== 'all') ? { category } : {}) } as any,
          { ...MedicinesService.CARD_PROJECTION, score: { $meta: 'textScore' } } as any,
        ).sort({ score: { $meta: 'textScore' } } as any).limit(cap);
      } catch { /* fall through to regex path */ }
    }

    // Regex path: substring/normalized/synonym matching (used when FTS misses)
    if (rows.length < 3) {
      rows = await this.model.find(this.buildQuery(search, (category && category !== 'all') ? category : undefined, includeUnverified), MedicinesService.CARD_PROJECTION)
        .sort({ verified: -1, usage_count: -1, name_ar: 1 }).limit(cap);
    }

    // Typo-tolerant fallback: zero hits → retry with letter-gap regex (normalization first)
    if (rows.length === 0 && search && search.trim().length >= 3) {
      const norm = this.normalizeSearchText(search);
      const tolerant = this.tolerantRegex(norm || search);
      rows = await this.model.find(
        { is_deleted: { $ne: true }, $or: [
          { name_ar: { $regex: tolerant, $options: 'i' } },
          { name_en: { $regex: tolerant, $options: 'i' } },
          { search_text: { $regex: tolerant, $options: 'i' } },
          { active_ingredient: { $regex: tolerant, $options: 'i' } },
        ] },
        MedicinesService.CARD_PROJECTION,
      ).sort({ usage_count: -1 }).limit(Math.min(cap, 50));
    }

    // Blend text search relevance with continuous dynamic popularity
    if (search && rows.length > 0 && this.rankingService) {
      const candidates = rows.map((r: any) => ({
        drugId: r.id,
        textScore: r.score || (r.verified ? 2.0 : 1.0),
      }));
      const blendedIds = await this.rankingService.blendSearchRelevance(candidates, { pharmacyId, category: (category && category !== 'all') ? category : undefined });
      if (blendedIds.length > 0) {
        const map = new Map(rows.map((r: any) => [r.id, r]));
        rows = blendedIds.map((id) => map.get(id)).filter(Boolean);
      }
    }

    this.trackSearch(search, rows.length, userId);
    const withBadges = rows.map((m: any) => this.withBadges(m?.toObject ? m.toObject() : m));
    await this.redis.setJson(cacheKey, withBadges, MedicinesService.LIST_CACHE_TTL);
    return withBadges;
  }

  /**
   * Paginated catalog listing — { data, total, page, total_pages }.
   * Results cached per (query,page,limit,sort,pharmacy) tuple so page turns are instant.
   */
  async paginate(
    search?: string,
    category?: string,
    page = 1,
    limit = 30,
    includeUnverified = true,
    sort = 'smart_ranking',
    pharmacyId?: string,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const cacheKey = `med:page:governed-v2:${search || ''}:${category || ''}:${includeUnverified}:${safePage}:${safeLimit}:${sort}:${pharmacyId || 'global'}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    // Continuous Dynamic Ranking Fast-Path when not searching text
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
        const query: any = {
          id: { $in: drugIds },
          ...(includeUnverified ? { is_deleted: { $ne: true } } : this.publicCatalogFilter()),
          ...((category && category !== 'all') ? { category } : {}),
        };
        const rows = await this.model.find(query, MedicinesService.CARD_PROJECTION);
        const map = new Map(rows.map((m: any) => [m.id, m]));
        const ordered = drugIds.map((id) => map.get(id)).filter(Boolean);
        const result = {
          data: ordered.map((m: any) => this.withBadges(m?.toObject ? m.toObject() : m)),
          total,
          page: safePage,
          limit: safeLimit,
          total_pages: Math.ceil(total / safeLimit),
        };
        await this.redis.setJson(cacheKey, result, MedicinesService.LIST_CACHE_TTL);
        return result;
      }
    }

    const q = this.buildQuery(search, (category && category !== 'all') ? category : undefined, includeUnverified);
    const [data, total] = await Promise.all([
      this.model.find(q, MedicinesService.CARD_PROJECTION)
        .sort({ verified: -1, usage_count: -1, name_ar: 1 })
        .skip((safePage - 1) * safeLimit).limit(safeLimit),
      (this.model as any).countDocuments ? (this.model as any).countDocuments(q) : Promise.resolve(0),
    ]);
    const result = {
      data: (data as any[]).map((m: any) => this.withBadges(m?.toObject ? m.toObject() : m)),
      total, page: safePage, limit: safeLimit, total_pages: Math.ceil(total / safeLimit),
    };
    await this.redis.setJson(cacheKey, result, MedicinesService.LIST_CACHE_TTL);
    return result;
  }

  /**
   * Cursor-based catalog browsing (O(1) page turns at any depth, no skip-scan).
   * Cursor encodes the last item's (name_ar, id); the next page continues after it.
   */
  async cursorPage(search: string | undefined, category: string | undefined, cursor: string | undefined, limit = 30) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const q: any = this.publicCatalogFilter();
    if (search) Object.assign(q, this.buildQuery(search, category, false));
    else if (category) q.category = category;

    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        q.$or = [
          { name_ar: { $gt: decoded.n } },
          { name_ar: decoded.n, id: { $gt: decoded.i } },
        ];
      } catch { /* invalid cursor → first page */ }
    }

    const cacheKey = `med:cursor:governed-v1:${search || ''}:${category || ''}:${cursor || ''}:${safeLimit}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const rows = await this.model.find(q, MedicinesService.CARD_PROJECTION)
      .sort({ name_ar: 1, id: 1 }).limit(safeLimit + 1);

    const hasMore = rows.length > safeLimit;
    const page = rows.slice(0, safeLimit);
    const last: any = page[page.length - 1];
    const next_cursor = hasMore && last
      ? Buffer.from(JSON.stringify({ n: last.name_ar, i: last.id }), 'utf8').toString('base64url')
      : null;

    const result = {
      data: page.map((m: any) => this.withBadges(m?.toObject ? m.toObject() : m)),
      limit: safeLimit,
      has_more: hasMore,
      next_cursor,
    };
    await this.redis.setJson(cacheKey, result, MedicinesService.LIST_CACHE_TTL);
    return result;
  }

  // ═══════════ Smart Cache — daily Hot Medicines (Top 50) ═══════════
  // Score over the last 90 days: orders 50% · searches 30% · product views 20%.
  // Generated once daily via cron; served from Redis/collection for instant reads.

  private get hotCol() { return this.conn.collection('hot_medicines'); }

  // On-demand administrative recalculation trigger (Continuous Dynamic Ranking is the live source of truth)
  async generateHotMedicines() {
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);

    // 1) Orders per medicine (qty) — weight 50%
    const ordersAgg = await this.conn.collection('orders').aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.medicine_id', qty: { $sum: { $ifNull: ['$items.qty', 1] } } } },
    ]).toArray();
    const orderScore = new Map<string, number>(ordersAgg.map((o: any) => [String(o._id), o.qty]));

    // 2) Product views — weight 20%
    const viewsAgg = await this.conn.collection('product_views').aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$medicine_id', views: { $sum: 1 } } },
    ]).toArray();
    const viewScore = new Map<string, number>(viewsAgg.map((v: any) => [String(v._id), v.views]));

    // 3) Searches — weight 30%: match search terms to medicine names
    const searchAgg = await this.conn.collection('search_queries').aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$term_lc', n: { $sum: 1 } } },
    ]).toArray();

    // Candidate set = anything with any signal
    const candidates = new Set<string>([...orderScore.keys(), ...viewScore.keys()]);
    // Add medicines matching frequent search terms (top 100 terms)
    const terms = searchAgg.sort((a: any, b: any) => b.n - a.n).slice(0, 100);
    const searchScore = new Map<string, number>();
    for (const t of terms) {
      const term = t._id;
      if (!term || term.length < 3) continue;
      const hits = await this.model.find(
        { $or: [{ name_ar: { $regex: term, $options: 'i' } }, { name_en: { $regex: term, $options: 'i' } }], ...this.publicCatalogFilter() },
        { _id: 0, id: 1 } as any,
      ).limit(50);
      for (const h of hits as any[]) {
        searchScore.set(h.id, (searchScore.get(h.id) || 0) + t.n);
        candidates.add(h.id);
      }
    }

    // Normalize each signal to its max, then weight
    const maxOf = (m: Map<string, number>) => Math.max(1, ...m.values());
    const [mo, ms, mv] = [maxOf(orderScore), maxOf(searchScore), maxOf(viewScore)];
    const scored = [...candidates].map((id) => ({
      id,
      score: (orderScore.get(id) || 0) / mo * 0.5
           + (searchScore.get(id) || 0) / ms * 0.3
           + (viewScore.get(id) || 0) / mv * 0.2,
    })).sort((a, b) => b.score - a.score).slice(0, 50);

    // Store with card data embedded (single read at runtime)
    await this.hotCol.deleteMany({});
    for (const s of scored) {
      const med: any = await this.model.findOne({ id: s.id, ...this.publicCatalogFilter() }, MedicinesService.CARD_PROJECTION);
      if (med) {
        await this.hotCol.insertOne({
          medicine_id: s.id,
          score: +s.score.toFixed(4),
          medicine: this.withBadges(med?.toObject ? med.toObject() : med),
          generated_at: new Date(),
        });
      }
    }
    await this.redis.setJson('med:hot', scored.map((s) => s.id), 90000); // 25h
    this.logger?.log?.(`Hot medicines generated: ${scored.length} items`);
    return { generated: scored.length };
  }

  /** GET /medicines/hot — Top 50 hot/trending medicines (continuous dynamic ranking). */
  async hot() {
    const cached = await this.redis.getJson<any[]>('med:hot:governed-v2:live');
    if (cached) return cached;

    if (this.rankingService) {
      const { drugIds } = await this.rankingService.getRankedDrugIds({
        pharmacyId: 'global',
        sort: 'trending',
        limit: 50,
      });

      if (drugIds.length > 0) {
        const rows = await this.model.find(
          { id: { $in: drugIds }, ...this.publicCatalogFilter() },
          MedicinesService.CARD_PROJECTION,
        );
        const map = new Map(rows.map((r: any) => [r.id, r]));
        const ordered = drugIds
          .map((id) => map.get(id))
          .filter(Boolean)
          .map((m: any) => this.withBadges(m?.toObject ? m.toObject() : m));
        if (ordered.length > 0) {
          await this.redis.setJson('med:hot:governed-v2:live', ordered, 180);
          return ordered;
        }
      }
    }

    const rows = await this.model.find(this.publicCatalogFilter(), MedicinesService.CARD_PROJECTION)
      .sort({ usage_count: -1, verified: -1 }).limit(50);
    const result = rows.map((m: any) => this.withBadges(m?.toObject ? m.toObject() : m));
    await this.redis.setJson('med:hot:governed-v2:live', result, 180);
    return result;
  }

  /** Light autocomplete - id+name only for live suggestions (cached 60s) */
  async autocomplete(query: string) {
    const q = (query || '').trim();
    if (q.length < 1) return [];
    const cacheKey = `med:autocomplete:governed-v1:${q.toLowerCase()}`;
    const cached = await this.redis.getJson<any[]>(cacheKey);
    if (cached) return cached;
    const re = new RegExp(q, 'i');
    const rows = await this.model.find(
      { $or: [{ name_ar: re }, { name_en: re }, { active_ingredient: re }], ...this.publicCatalogFilter() },
      { _id: 0, id: 1, name_ar: 1, name_en: 1, active_ingredient: 1, image: 1, price: 1, requires_prescription: 1, category: 1 }
    ).sort({ usage_count: -1 }).limit(10);
    await this.redis.setJson(cacheKey, rows, MedicinesService.AUTOCOMPLETE_CACHE_TTL);
    return rows;
  }

  /** Invalidate medicine caches after admin create/update/delete. */
  async invalidateCache() {
    try {
      const client = (this.redis as any).getClient?.();
      if (client) {
        const keys = await client.keys('med:*');
        if (keys.length) await client.del(...keys);
      }
    } catch { /* cache invalidation is best-effort */ }
  }

  /**
   * Parse a raw barcode string. Handles plain GTINs as well as GS1 DataMatrix
   * payloads that interleave Application Identifiers (AIs) like:
   *   01<GTIN14>17<YYMMDD>10<BATCH><GS>21<SERIAL>
   * where <GS> is the ASCII Group Separator (\x1d).
   * Returns the best candidate code(s) to query against the catalog.
   */
  private extractCodes(raw: string): string[] {
    if (!raw) return [];
    const cleaned = raw.replace(/[\x00-\x1f\x7f]/g, '|'); // normalize control chars
    const out = new Set<string>();
    out.add(raw);
    out.add(cleaned);

    // GS1 DataMatrix: "01" + 14 digit GTIN is the most common AI prefix
    const gtinMatch = cleaned.match(/^01(\d{14})/);
    if (gtinMatch) {
      const gtin14 = gtinMatch[1];
      out.add(gtin14);
      // Drop the leading "0" to get a GTIN-13 / EAN-13
      if (gtin14.startsWith('0')) out.add(gtin14.substring(1));
    }

    // Sometimes scanners emit the GTIN with leading zeros stripped — also try padded
    if (/^\d{12,14}$/.test(raw)) {
      out.add(raw.padStart(14, '0'));
    }

    return Array.from(out);
  }

  /** Lookup medicine by exact barcode (EAN13/UPC/etc). Returns first match or null.
   *  Supports plain GTINs and GS1 DataMatrix payloads (with non-printable separators).
   */
  async byBarcode(code: string) {
    const c = (code || '').trim();
    if (!c) return { found: false, source: 'none', medicine: null };

    const candidates = this.extractCodes(c);

    // 1) Exact match in catalog (try all candidate codes)
    const doc = await this.model.findOne(
      { barcode: { $in: candidates }, ...this.publicCatalogFilter() },
      { _id: 0, __v: 0 },
    ).lean();
    if (doc) return { found: true, source: 'catalog', medicine: doc, codes_tried: candidates };

    // 2) Fuzzy match on name / active_ingredient (in case scanner read a textual code)
    const fuzzy = await this.model.findOne(
      { $or: [{ name_en: { $regex: c, $options: 'i' } }, { active_ingredient: { $regex: c, $options: 'i' } }], ...this.publicCatalogFilter() },
      { _id: 0, __v: 0 },
    ).lean();
    if (fuzzy) return { found: true, source: 'fuzzy', medicine: fuzzy, codes_tried: candidates };

    return {
      found: false,
      source: 'none',
      medicine: null,
      codes_tried: candidates,
      // hint for the frontend: ask AI fallback
      ai_lookup_recommended: true,
    };
  }

  /** Category counts for category strip in Pharmacy tab */
  async categories() {
    const cacheKey = 'med:categories-governed-v1';
    const cached = await this.redis.getJson<any[]>(cacheKey);
    if (cached) return cached;
    const agg: any[] = await this.model.aggregate([
      { $match: this.publicCatalogFilter() },
      { $group: { _id: { cat: '$category', sub: '$sub_category' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const tree: Record<string, { count: number; subs: Record<string, number> }> = {};
    for (const r of agg) {
      const cat = r._id.cat || 'أخرى';
      if (!tree[cat]) tree[cat] = { count: 0, subs: {} };
      tree[cat].count += r.count;
      if (r._id.sub) tree[cat].subs[r._id.sub] = (tree[cat].subs[r._id.sub] || 0) + r.count;
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

  async compare(ids: string[]) {
    if (!ids || !ids.length) return [];
    return this.model.find({ id: { $in: ids }, ...this.publicCatalogFilter() }, { _id: 0, __v: 0 }).lean();
  }

  async getById(id: string) {
    const m = await this.model.findOne({ id, is_deleted: { $ne: true } }, { _id: 0, __v: 0 });
    if (!m) throw new NotFoundException();
    return m;
  }

  async getPublicById(id: string) {
    const m = await this.model.findOne({ id, ...this.publicCatalogFilter() }, { _id: 0, __v: 0 });
    if (!m) throw new NotFoundException();
    return m;
  }

  /**
   * Enriched details: medicine + alternatives + live stock aggregation + insurance coverage.
   * Single call to power the Medicine Detail screen.
   */
  async details(id: string, userId?: string, lang?: DbLang) {
    const med = await this.getPublicById(id);
    // Product-view signal for the hot-medicines score + recently-viewed (fire & forget)
    try {
      this.conn.collection('product_views').insertOne({ medicine_id: id, user_id: userId || null, createdAt: new Date() }).catch(() => {});
      this.model.updateOne({ id }, { $inc: { usage_count: 1 } }).catch(() => {});
    } catch { /* analytics must never break details */ }
    const [alts, stock] = await Promise.all([
      med.active_ingredient
        ? this.model.find(
            { active_ingredient: med.active_ingredient, id: { $ne: id }, ...this.publicCatalogFilter() },
            { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, manufacturer: 1, requires_prescription: 1 },
          ).limit(8)
        : [],
      this.aggregateStock(id),
    ]);
    // Lazily refresh denormalized aggregates if stale
    if (stock.aggregate_stock !== (med as any).aggregate_stock || stock.pharmacies_count !== (med as any).pharmacies_count) {
      this.model.updateOne({ id }, { $set: { aggregate_stock: stock.aggregate_stock, pharmacies_count: stock.pharmacies_count } }).catch(() => {});
    }
    const raw: any = (med as any).toObject ? (med as any).toObject() : med;

    // Unified gallery: images[] + image_1..image_5 + legacy image, deduped, R2-only order preserved
    const gallery = [
      ...(Array.isArray(raw.images) ? raw.images : []),
      raw.image_1, raw.image_2, raw.image_3, raw.image_4, raw.image_5,
      raw.image,
    ].filter((u: any, i: number, arr: any[]) => typeof u === 'string' && u.length > 4 && arr.indexOf(u) === i);

    // Dynamic discount — old_price is the pre-discount price
    const price = raw.price || 0;
    const old = raw.old_price || 0;
    const discount_percent = old > price && price > 0 ? Math.round((1 - price / old) * 100) : 0;

    const localizedRaw = localizeMedicineStructured(raw, lang);

    return {
      ...localizedRaw,
      images: gallery,
      image: gallery[0] || raw.image || null,
      discount_percent,
      has_discount: discount_percent > 0,
      // "Potentially Unavailable" badge — visible only after ADMIN approval of a shortage report
      potentially_unavailable: raw.availability_status === 'availability_may_be_limited' || raw.availability_status === 'admin_flagged_shortage',
      discontinued: raw.availability_status === 'discontinued',
      available: raw.availability_status === 'none' || !raw.availability_status,
      alternatives: alts,
      stock_status: stock,
    };
  }

  /** Aggregate stock across all pharmacies via the inventory collection. */
  async aggregateStock(medicine_id: string) {
    // We use a soft import to avoid coupling — query the inventory collection directly via the model connection.
    const conn: any = (this.model as any).db;
    const InvModel = conn.models?.PharmacyInventory || conn.model?.('PharmacyInventory');
    if (!InvModel) return { aggregate_stock: 0, pharmacies_count: 0, in_stock: false };
    const agg = await InvModel.aggregate([
      { $match: { medicine_id, is_available: true } },
      { $group: { _id: null, total: { $sum: '$stock_qty' }, n: { $sum: { $cond: [{ $gt: ['$stock_qty', 0] }, 1, 0] } } } },
    ]);
    const row = (agg && agg[0]) || { total: 0, n: 0 };
    return { aggregate_stock: row.total || 0, pharmacies_count: row.n || 0, in_stock: (row.total || 0) > 0 };
  }

  async alternatives(id: string) {
    const med = await this.getPublicById(id);
    if (!med.active_ingredient) return [];
    return this.model.find(
      { active_ingredient: med.active_ingredient, id: { $ne: id }, ...this.publicCatalogFilter() },
      { _id: 0, __v: 0 },
    ).limit(20);
  }

  // RULE: Manual entries from patient/doctor/pharmacy are operational immediately.
  // Admin async review later.
  async createManualEntry(data: Partial<Medicine>, byUserId: string, byRole: string) {
    const m = await this.model.create({
      ...data,
      verified: false,
      source: byRole,
      created_by_user_id: byUserId,
      created_by_role: byRole,
    });
    this.events.emit(EVENTS.MEDICINE_PENDING_REVIEW, { medicine_id: m.id, by_role: byRole });
    await this.invalidateCache();
    return m;
  }

  async approve(id: string, by: string) {
    const existing: any = await this.model.findOne({ id, is_deleted: { $ne: true } });
    if (!existing) throw new NotFoundException();
    const translationGaps = missingPublicMedicineTranslations(existing.toObject ? existing.toObject() : existing);
    if (translationGaps.length) {
      throw new BadRequestException(`public_translation_incomplete:${translationGaps.join(',')}`);
    }
    const reviewedAt = new Date();
    const m = await this.model.findOneAndUpdate(
      { id },
      {
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
      },
      { new: true, projection: { _id: 0, __v: 0 } },
    );
    if (!m) throw new NotFoundException();
    this.events.emit(EVENTS.MEDICINE_APPROVED, { medicine_id: id, by });
    await this.refreshPublicProjection(m, by, 'medicine_approved');
    await this.invalidateCache();
    return m;
  }

  async reject(id: string, by: string, reason: string) {
    const reviewedAt = new Date();
    const m = await this.model.findOneAndUpdate(
      { id },
      {
        $set: {
          rejected_reason: reason,
          verified: false,
          public_eligibility: false,
          indexing_eligibility: false,
          medical_review_status: 'rejected',
          last_reviewed: reviewedAt,
          provenance: 'admin_medicine_review',
        },
      },
      { new: true, projection: { _id: 0, __v: 0 } },
    );
    if (!m) throw new NotFoundException();
    this.events.emit(EVENTS.MEDICINE_REJECTED, { medicine_id: id, by, reason });
    await this.refreshPublicProjection(m, by, 'medicine_rejected');
    await this.invalidateCache();
    return m;
  }

  async update(id: string, data: Partial<Medicine>) {
    // If the image is being REPLACED, remove the old object from S3/R2
    if (data.image) {
      const old: any = await this.model.findOne({ id });
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

  // ============ ADMIN CATALOG CRUD ============
  async createCatalog(data: any, byUserId: string) {
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
    this.events.emit(EVENTS.MEDICINE_APPROVED, { medicine_id: m.id, by: byUserId });
    await this.invalidateCache();
    return m;
  }

  // ═══════════ "Potentially Unavailable" badge — Phase 6 workflow ═══════════
  // Provider reports → status 'pending' (NO badge yet) → ADMIN approves →
  // availability_status flips → badge appears in API. Product ALWAYS stays
  // purchasable — the badge is a warning only.

  /** Provider reports a shortage. Badge does NOT appear until admin approval. */
  async reportShortage(medicineId: string, reporter: { id: string; role: string }, body: { note?: string; quantity_available?: number }) {
    const med: any = await this.getById(medicineId);
    if (!med) throw new NotFoundException('Medicine not found');
    // One open report per medicine per reporter
    const dup = await this.shortageReports.findOne({ medicine_id: medicineId, reporter_id: reporter.id, status: 'pending' });
    if (dup) return { ok: true, report_id: dup.id, note: 'already_reported' };

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

    // Notify admins (role-based notification → admin dashboard + push)
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

  /** Admin: list shortage reports (filterable by status, paginated). */
  async listShortageReports(status = 'pending', page = 1, limit = 20): Promise<any> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const filter = status === 'all' ? {} : { status };
    const [rows, total] = await Promise.all([
      this.shortageReports.find(filter, { projection: { _id: 0 } })
        .sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).toArray(),
      this.shortageReports.countDocuments(filter),
    ]);
    const counts = await this.shortageReports.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray();
    const by_status: Record<string, number> = {};
    for (const c of counts) by_status[c._id] = c.n;
    return { data: rows, total, page: safePage, total_pages: Math.ceil(total / safeLimit), counts: by_status };
  }

  /** Admin: approve → the "Potentially Unavailable" badge becomes visible. */
  async approveShortageReport(reportId: string, adminId: string) {
    const report: any = await this.shortageReports.findOne({ id: reportId });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== 'pending') throw new BadRequestException(`Report already ${report.status}`);

    await this.model.updateOne(
      { id: report.medicine_id },
      { $set: { availability_status: 'availability_may_be_limited', shortage_notes: report.note || null, updatedAt: new Date() } },
    );
    await this.shortageReports.updateOne(
      { id: reportId },
      { $set: { status: 'approved', reviewed_by: adminId, reviewed_at: new Date(), updatedAt: new Date() } },
    );
    // Auto-reject other pending reports for the same medicine (superseded)
    await this.shortageReports.updateMany(
      { medicine_id: report.medicine_id, status: 'pending', id: { $ne: reportId } },
      { $set: { status: 'superseded', updatedAt: new Date() } },
    );
    this.audit('medicine.shortage_approved', reportId, adminId, 'admin', { medicine_id: report.medicine_id });
    await this.invalidateCache();
    return { ok: true, badge: 'availability_may_be_limited' };
  }

  /** Admin: reject → no badge; product keeps selling normally. */
  async rejectShortageReport(reportId: string, adminId: string, reason?: string) {
    const report: any = await this.shortageReports.findOne({ id: reportId });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== 'pending') throw new BadRequestException(`Report already ${report.status}`);
    await this.shortageReports.updateOne(
      { id: reportId },
      { $set: { status: 'rejected', reviewed_by: adminId, reviewed_at: new Date(), rejection_reason: reason || null, updatedAt: new Date() } },
    );
    this.audit('medicine.shortage_rejected', reportId, adminId, 'admin', { medicine_id: report.medicine_id, reason });
    return { ok: true };
  }

  /** Admin: clear the badge when stock normalizes. */
  async clearShortageBadge(medicineId: string, adminId: string) {
    await this.model.updateOne(
      { id: medicineId },
      { $set: { availability_status: 'none', shortage_notes: null, updatedAt: new Date() } },
    );
    this.audit('medicine.shortage_badge_cleared', medicineId, adminId, 'admin', {});
    await this.invalidateCache();
    return { ok: true };
  }

  /** Admin: set availability explicitly — Available | May be unavailable | Discontinued (future) */
  async setAvailability(medicineId: string, adminId: string, status: string) {
    const allowed = ['none', 'availability_may_be_limited', 'admin_flagged_shortage', 'discontinued'];
    if (!allowed.includes(status)) throw new BadRequestException(`status must be one of: ${allowed.join(', ')}`);
    await this.model.updateOne({ id: medicineId }, { $set: { availability_status: status, updatedAt: new Date() } });
    this.audit('medicine.availability_changed', medicineId, adminId, 'admin', { status });
    await this.invalidateCache();
    return { ok: true, status };
  }

  // ═══════════ Medicine image suggestion workflow (Phase 2) ═══════════
  // Pharmacy suggests an image (uploaded via POST /storage first) → pending →
  // ADMIN approves → R2 object becomes the medicine image, old R2 image deleted.

  private get imageSuggestions() { return this.conn.collection('medicine_image_suggestions'); }
  private get storageObjects() { return this.conn.collection('storage_objects'); }

  /** Immutable audit trail for sensitive admin/provider actions (system_events). */
  private audit(type: string, entityId: string, actorId: string, actorRole: string, meta?: any) {
    this.conn.collection('system_events').insertOne({
      type,
      entity_type: type.split('.')[0],
      entity_id: entityId,
      actor_account_id: actorId,
      actor_role: actorRole,
      meta: meta || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }).catch(() => { /* audit must never break the action */ });
  }

  /** Provider suggests a new image for a medicine. */
  async suggestImage(medicineId: string, reporter: { id: string; role: string }, body: { storage_id?: string; image_url?: string; note?: string }) {
    const med: any = await this.getById(medicineId);
    if (!med) throw new NotFoundException('Medicine not found');
    if (!body?.storage_id && !body?.image_url) throw new BadRequestException('storage_id or image_url is required');

    // Resolve the uploaded object (must exist and not be deleted)
    let resolvedUrl = body.image_url || null;
    if (body.storage_id) {
      const obj: any = await this.storageObjects.findOne({ id: body.storage_id, deleted: { $ne: true } });
      if (!obj) throw new NotFoundException('Uploaded image not found');
      resolvedUrl = obj.external_url || `/api/v1/storage/${obj.id}`;
    }

    // Guests share the synthetic id 'guest' — dedupe only for real accounts,
    // otherwise one visitor's pending suggestion would swallow everyone else's.
    if (reporter.id !== 'guest') {
      const dup = await this.imageSuggestions.findOne({ medicine_id: medicineId, suggested_by: reporter.id, status: 'pending' });
      if (dup) return { ok: true, suggestion_id: dup.id, note: 'already_pending' };
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

  /** Admin: list image suggestions. */
  async listImageSuggestions(status = 'pending', page = 1, limit = 20): Promise<any> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const filter = status === 'all' ? {} : { status };
    const [rows, total] = await Promise.all([
      this.imageSuggestions.find(filter, { projection: { _id: 0 } })
        .sort({ createdAt: -1 }).skip((Math.max(page, 1) - 1) * safeLimit).limit(safeLimit).toArray(),
      this.imageSuggestions.countDocuments(filter),
    ]);
    return { data: rows, total, page: Math.max(page, 1), total_pages: Math.ceil(total / safeLimit) };
  }

  /** Admin: approve → new image goes live in R2, old one deleted, DB updated. */
  async approveImageSuggestion(suggestionId: string, adminId: string) {
    const s: any = await this.imageSuggestions.findOne({ id: suggestionId });
    if (!s) throw new NotFoundException('Suggestion not found');
    if (s.status !== 'pending') throw new BadRequestException(`Suggestion already ${s.status}`);

    const med: any = await this.getById(s.medicine_id);
    if (!med) throw new NotFoundException('Medicine not found');

    // Update the medicine image (main + first slot)
    await this.model.updateOne(
      { id: s.medicine_id },
      { $set: { image: s.suggested_url, image_1: s.suggested_url, updatedAt: new Date() } },
    );
    // Physically delete the OLD image from R2 (event handled by storage module)
    if (med.image && med.image !== s.suggested_url) {
      this.events.emit('storage.delete_by_url', { url: med.image });
    }
    await this.imageSuggestions.updateOne(
      { id: suggestionId },
      { $set: { status: 'approved', reviewed_by: adminId, reviewed_at: new Date(), updatedAt: new Date() } },
    );
    this.audit('medicine.image_approved', suggestionId, adminId, 'admin', { medicine_id: s.medicine_id, new_image: s.suggested_url });
    await this.invalidateCache();
    return { ok: true, medicine_id: s.medicine_id, new_image: s.suggested_url, old_image_deleted: !!med.image };
  }

  /** Admin: reject an image suggestion. */
  async rejectImageSuggestion(suggestionId: string, adminId: string, reason?: string) {
    const s: any = await this.imageSuggestions.findOne({ id: suggestionId });
    if (!s) throw new NotFoundException('Suggestion not found');
    if (s.status !== 'pending') throw new BadRequestException(`Suggestion already ${s.status}`);
    await this.imageSuggestions.updateOne(
      { id: suggestionId },
      { $set: { status: 'rejected', reviewed_by: adminId, reviewed_at: new Date(), rejection_reason: reason || null, updatedAt: new Date() } },
    );
    this.audit('medicine.image_rejected', suggestionId, adminId, 'admin', { medicine_id: s.medicine_id, reason });
    return { ok: true };
  }

  async deleteCatalog(id: string) {
    const m = await this.model.findOneAndUpdate({ id }, { $set: { is_deleted: true } }, { new: true });
    if (!m) throw new NotFoundException();
    // Physically remove the medicine image from S3/R2 (if it lives there)
    if ((m as any).image) this.events.emit('storage.delete_by_url', { url: (m as any).image });
    await this.invalidateCache();
    return { ok: true };
  }

  // ============ BULK IMPORT (CSV / JSON) ============
  /**
   * Bulk imports stay UNVERIFIED until admin approves them — they're operational
   * (returned in search) but flagged so the admin can validate.
   */
  async bulkImport(rows: any[], byUserId: string, byRole: string, autoApprove = false) {
    const created: any[] = [];
    const failed: any[] = [];
    for (const r of rows) {
      try {
        const name_ar = String(r.name_ar || r['name ar'] || r['اسم عربي'] || '').trim();
        if (!name_ar) { failed.push({ row: r, error: 'missing name_ar' }); continue; }
        const doc: any = {
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
          // Imports remain hidden until an explicit medical publication review.
          public_eligibility: false,
          indexing_eligibility: false,
          medical_review_status: 'pending',
          provenance: 'bulk_import_pending_review',
          approved_at: autoApprove ? new Date() : undefined,
          approved_by: autoApprove ? byUserId : undefined,
        };
        // Upsert by name_ar to avoid duplicates
        const m = await this.model.findOneAndUpdate(
          { name_ar: doc.name_ar },
          { $setOnInsert: doc },
          { upsert: true, new: true, projection: { _id: 0, __v: 0 } },
        );
        created.push(m);
        if (!autoApprove) this.events.emit(EVENTS.MEDICINE_PENDING_REVIEW, { medicine_id: m.id, by_role: byRole });
      } catch (e: any) {
        failed.push({ row: r, error: e.message });
      }
    }
        await this.invalidateCache();
    return { ok: true, imported: created.length, failed: failed.length, failed_rows: failed.slice(0, 20), needs_review: !autoApprove };
  }

  parseCsv(csv: string): any[] {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = this.splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = this.splitCsvLine(line);
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
      return obj;
    });
  }
  private splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
      else { cur += c; }
    }
    out.push(cur);
    return out;
  }

  // ═══════════ Unified catalog change-request workflow ═══════════
  // ANY user (patient / provider / pharmacist) can propose ANY change to a
  // catalog item — field edit, image removal, shortage badge, duplicate
  // removal, a brand-new item, or free-form. Nothing goes live until an
  // ADMIN approves; every decision is audited in system_events.

  private get changeRequests() { return this.conn.collection('catalog_change_requests'); }

  /** Fields a change-request (or admin direct edit) may touch — mass-assignment whitelist. */
  static readonly EDITABLE_FIELDS = [
    'name_ar', 'name_en', 'active_ingredient', 'generic_name', 'manufacturer',
    'category', 'sub_category', 'brand', 'description_ar', 'description_en', 'dosage_ar', 'dosage_en',
    'form', 'strength', 'usage_instructions_ar', 'usage_instructions_en',
    'requires_prescription', 'barcode', 'price', 'images', 'image',
    'indications_ar', 'indications_en', 'contraindications_ar', 'contraindications_en',
    'warnings_ar', 'warnings_en', 'side_effects_ar', 'side_effects_en',
    'precautions_ar', 'precautions_en', 'interactions', 'package_size', 'storage_conditions',
  ];

  static readonly CHANGE_TYPES = ['field_edit', 'image_remove', 'shortage_badge', 'duplicate_remove', 'new_item', 'other'];

  private pickEditable(obj: any): any {
    const out: any = {};
    for (const f of MedicinesService.EDITABLE_FIELDS) {
      if (obj && obj[f] !== undefined) out[f] = obj[f];
    }
    return out;
  }

  private notifyAdmin(title: string, body: string, data: any) {
    return this.notifications.insertOne({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: 'admin', title_key: title, body_key: body, type: 'alert', priority: 'normal',
      data, is_read: false, createdAt: new Date(), updatedAt: new Date(),
    }).catch(() => {});
  }

  /** User proposes a change to an existing catalog item. */
  async suggestChange(medicineId: string, reporter: { id: string; role: string }, body: { type?: string; changes?: any; note?: string }) {
    const med: any = await this.getById(medicineId);
    if (!med) throw new NotFoundException('الصنف غير موجود');
    const type = String(body?.type || '');
    if (!MedicinesService.CHANGE_TYPES.includes(type) || type === 'new_item') {
      throw new BadRequestException(`type must be one of: ${MedicinesService.CHANGE_TYPES.filter(t => t !== 'new_item').join(', ')}`);
    }
    const changes = this.pickEditable(body?.changes);
    if (type === 'field_edit' && Object.keys(changes).length === 0) {
      throw new BadRequestException('changes must include at least one editable field');
    }
    // Snapshot current values so the admin sees a real old→new diff
    const current: any = {};
    for (const f of Object.keys(changes)) current[f] = med[f] ?? null;

    if (reporter.id !== 'guest') {
      const dup = await this.changeRequests.findOne({ medicine_id: medicineId, reporter_id: reporter.id, type, status: 'pending' });
      if (dup) return { ok: true, request_id: dup.id, note: 'already_pending' };
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

  /** User proposes a catalog item that does not exist yet. */
  async suggestNewItem(reporter: { id: string; role: string }, body: any) {
    const data = this.pickEditable(body);
    if (!data.name_ar && !data.name_en) throw new BadRequestException('name_ar or name_en is required');
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

  /** Admin: list change requests with filters. */
  async listChangeRequests(status = 'pending', type?: string, page = 1, limit = 20): Promise<any> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const filter: any = status === 'all' ? {} : { status };
    if (type) filter.type = type;
    const [rows, total] = await Promise.all([
      this.changeRequests.find(filter, { projection: { _id: 0 } })
        .sort({ createdAt: -1 }).skip((Math.max(page, 1) - 1) * safeLimit).limit(safeLimit).toArray(),
      this.changeRequests.countDocuments(filter),
    ]);
    return { data: rows, total, page: Math.max(page, 1), total_pages: Math.ceil(total / safeLimit) };
  }

  /** Admin: approve → the proposed change is applied to the catalog NOW.
   *  Supports PARTIAL approval: `approved_fields` limits which suggested
   *  fields go live, and `overrides` lets the admin edit values before
   *  approval (both still pass through the EDITABLE_FIELDS whitelist). */
  async approveChangeRequest(requestId: string, adminId: string, opts: { overrides?: any; approved_fields?: string[] } = {}) {
    const r: any = await this.changeRequests.findOne({ id: requestId });
    if (!r) throw new NotFoundException('Request not found');
    if (r.status !== 'pending') throw new BadRequestException(`Request already ${r.status}`);

    const overrides = this.pickEditable(opts?.overrides);
    let rejectedFields: string[] = [];
    let applied: any = {};
    if (r.type === 'field_edit') {
      let patch = this.pickEditable(r.changes);
      if (Array.isArray(opts?.approved_fields)) {
        const keep = new Set(opts.approved_fields.filter(f => MedicinesService.EDITABLE_FIELDS.includes(f)));
        rejectedFields = Object.keys(patch).filter(f => !keep.has(f));
        patch = Object.fromEntries(Object.entries(patch).filter(([f]) => keep.has(f)));
      }
      patch = { ...patch, ...overrides };
      if (Object.keys(patch).length === 0) throw new BadRequestException('Nothing to apply');
      await this.model.updateOne({ id: r.medicine_id }, { $set: { ...patch, updatedAt: new Date() } });
      applied = patch;
    } else if (r.type === 'image_remove') {
      const med: any = await this.getById(r.medicine_id);
      if (med?.image) this.events.emit('storage.delete_by_url', { url: med.image });
      await this.model.updateOne({ id: r.medicine_id }, { $set: { image: null, image_1: null, updatedAt: new Date() } });
      applied = { image: null };
    } else if (r.type === 'shortage_badge') {
      await this.model.updateOne({ id: r.medicine_id }, { $set: { availability_status: 'admin_flagged_shortage', updatedAt: new Date() } });
      applied = { availability_status: 'admin_flagged_shortage' };
    } else if (r.type === 'duplicate_remove') {
      await this.model.updateOne({ id: r.medicine_id }, { $set: { is_deleted: true, updatedAt: new Date() } });
      applied = { is_deleted: true };
    } else if (r.type === 'new_item') {
      const data = { ...this.pickEditable(r.changes), ...overrides };
      const created = await this.createCatalog({ ...data, verified: true }, adminId);
      applied = { new_medicine_id: created.id };
    }
    // 'other' → informational; approval just acknowledges it.

    await this.changeRequests.updateOne(
      { id: requestId },
      { $set: { status: rejectedFields.length ? 'partially_approved' : 'approved', reviewed_by: adminId, reviewed_at: new Date(), applied, rejected_fields: rejectedFields, updatedAt: new Date() } },
    );
    this.audit('medicine.change_approved', requestId, adminId, 'admin', { type: r.type, medicine_id: r.medicine_id, applied, rejected_fields: rejectedFields });
    await this.invalidateCache();
    return { ok: true, applied };
  }

  /** Admin: reject with a reason the reporter can see. */
  async rejectChangeRequest(requestId: string, adminId: string, reason?: string) {
    const r: any = await this.changeRequests.findOne({ id: requestId });
    if (!r) throw new NotFoundException('Request not found');
    if (r.status !== 'pending') throw new BadRequestException(`Request already ${r.status}`);
    await this.changeRequests.updateOne(
      { id: requestId },
      { $set: { status: 'rejected', reviewed_by: adminId, reviewed_at: new Date(), rejection_reason: reason || null, updatedAt: new Date() } },
    );
    this.audit('medicine.change_rejected', requestId, adminId, 'admin', { type: r.type, medicine_id: r.medicine_id, reason });
    return { ok: true };
  }

  /** Admin: direct edit of any catalog item (search → edit → save, no request needed). */
  /** Admin catalog browser: paginated, searchable, incl. soft-deleted filter. */
  async adminListCatalog(opts: { q?: string; category?: string; page?: number; limit?: number; includeDeleted?: boolean }) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 25));
    const filter: any = {};
    // AuditPlugin auto-hides deleted docs unless the query pins is_deleted:true —
    // so includeDeleted needs two parallel queries (active + deleted) merged.
    if (opts.category) filter.category = opts.category;
    if (opts.q?.trim()) {
      const rx = new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name_ar: rx }, { name_en: rx }, { active_ingredient: rx }, { barcode: rx }, { manufacturer: rx }, { brand: rx }];
    }
    if (opts.includeDeleted) {
      // aggregate() is not hooked by the AuditPlugin, so deleted docs are visible here.
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

  /** Admin: create a brand-new catalog item (all editable fields accepted). */
  async adminCreateCatalog(body: any, adminId: string) {
    const clean = this.pickEditable(body);
    if (!clean.name_ar && !clean.name_en) throw new BadRequestException('name_ar أو name_en مطلوب');
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
    await this.model.create(doc as any);
    await this.priceHistory.insertOne({ id: `mph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, medicine_id: id, before_price: null, after_price: doc.price, reason: String(body?.reason || 'إنشاء صنف جديد'), changed_by: adminId, createdAt: new Date() });
    this.audit('medicine.admin_create', id, adminId, 'admin', { after: clean });
    await this.invalidateCache();
    return { ok: true, id };
  }

  /** Admin: soft-delete (hidden everywhere) or restore a catalog item. */
  async adminSetDeleted(medicineId: string, deleted: boolean, adminId: string) {
    // The global AuditPlugin auto-filters out soft-deleted docs unless the query
    // explicitly pins is_deleted — so pin it to the state we're transitioning FROM.
    const med: any = await this.model.findOne({ id: medicineId, is_deleted: !deleted }, { _id: 0, __v: 0 }).lean();
    if (!med) throw new NotFoundException(deleted ? 'الصنف غير موجود' : 'الصنف غير موجود أو ليس محذوفاً');
    // updateOne is not hooked by the plugin, but pin is_deleted for the same reason.
    await this.model.updateOne({ id: medicineId, is_deleted: !deleted }, { $set: { is_deleted: deleted, deleted_at: deleted ? new Date() : null, updated_by: adminId, updatedAt: new Date() } });
    this.audit(deleted ? 'medicine.admin_soft_delete' : 'medicine.admin_restore', medicineId, adminId, 'admin', {});
    await this.invalidateCache();
    return { ok: true, is_deleted: deleted };
  }

  /** Admin reports: top-selling medicines + most-reported-unavailable. */
  async getPriceHistory(medicineId: string, page = 1, limit = 50): Promise<{ data: any[]; total: number; page: number; pages: number }> {
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
    // Top selling: aggregate delivered/completed pharmacy order items
    let topSelling: any[] = [];
    try {
      topSelling = await db.collection('pharmacy_orders').aggregate([
        { $match: { status: { $nin: ['cancelled', 'rejected'] } } },
        { $unwind: '$items' },
        { $group: { _id: { id: '$items.medicine_id', name: { $ifNull: ['$items.name_ar', '$items.name'] } }, qty: { $sum: { $ifNull: ['$items.quantity', 1] } }, revenue: { $sum: { $ifNull: ['$items.price', 0] } } } },
        { $sort: { qty: -1 } },
        { $limit: 20 },
      ]).toArray();
    } catch { /* orders collection shape varies */ }
    // Fallback/merge: usage_count field maintained on the catalog itself
    const byUsage = await this.model.find({ usage_count: { $gt: 0 }, is_deleted: { $ne: true } } as any, { id: 1, name_ar: 1, name_en: 1, usage_count: 1, price: 1 } as any).sort({ usage_count: -1 }).limit(20).lean();
    // Most requested-but-unavailable: shortage reports grouped by medicine
    const mostUnavailable = await db.collection('pharmacy_shortage_reports').aggregate([
      { $group: { _id: '$medicine_id', name: { $last: '$medicine_name' }, reports: { $sum: 1 }, last_report: { $max: '$createdAt' } } },
      { $sort: { reports: -1 } },
      { $limit: 20 },
    ]).toArray();
    return {
      top_selling: topSelling.map((t: any) => ({ medicine_id: t._id?.id || null, name: t._id?.name || '—', qty: t.qty, revenue: t.revenue })),
      top_by_usage: (byUsage as any[]).map((m) => ({ medicine_id: m.id, name: m.name_ar || m.name_en, usage_count: m.usage_count, price: m.price })),
      most_unavailable: mostUnavailable.map((r: any) => ({ medicine_id: r._id, name: r.name || '—', reports: r.reports, last_report: r.last_report })),
      generated_at: new Date(),
    };
  }

  async adminUpdateCatalog(medicineId: string, patch: any, adminId: string) {
    const med: any = await this.getById(medicineId);
    if (!med) throw new NotFoundException('الصنف غير موجود');    const clean = this.pickEditable(patch);
    const extra: any = {};
    if (clean.price !== undefined && Number(clean.price) !== Number(med.price || 0)) {
      const priceReason = String(patch?.reason || '').trim();
      if (priceReason.length < 5) throw new BadRequestException('price_change_reason_required');
    }
    if (patch?.availability_status !== undefined) {
      const allowed = ['none', 'availability_may_be_limited', 'admin_flagged_shortage', 'discontinued'];
      if (!allowed.includes(patch.availability_status)) throw new BadRequestException('invalid availability_status');
      extra.availability_status = patch.availability_status;
    }
    if (patch?.image !== undefined) extra.image = patch.image;
    if (Object.keys(clean).length === 0 && Object.keys(extra).length === 0) {
      throw new BadRequestException('patch must include at least one editable field');
    }
    const before: any = {};
    for (const f of Object.keys({ ...clean, ...extra })) before[f] = med[f] ?? null;
    // Any public content change requires a fresh medical review. Availability-only
    // changes still refresh the public projection but do not bypass this rule.
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
    // Physically delete any image the edit removed (main image, gallery
    // entries, image_1..5 slots) from R2 — no orphaned files on the CDN.
    const after = { ...clean, ...extra };
    const collectImgs = (doc: any): string[] => {
      if (!doc) return [];
      const out: string[] = [];
      if (Array.isArray(doc.images)) out.push(...doc.images.filter(Boolean));
      for (const k of ['image', 'image_1', 'image_2', 'image_3', 'image_4', 'image_5']) if (doc[k]) out.push(doc[k]);
      return [...new Set(out)];
    };
    // Compare against the FULL merged document so a URL still referenced by an
    // un-patched slot (e.g. main image) is never deleted out from under it.
    const merged = { ...med, ...after };
    const removed = collectImgs(med).filter(u => !collectImgs(merged).includes(u));
    for (const url of removed) this.events.emit('storage.delete_by_url', { url });
    if (requiresReapproval) {
      await this.refreshPublicProjection({ ...med, ...after, ...governanceReset }, adminId, 'medicine_admin_edit_reapproval');
    }
    this.audit('medicine.admin_direct_edit', medicineId, adminId, 'admin', { before, after, requires_reapproval: requiresReapproval, images_deleted: removed });
    await this.invalidateCache();
    return { ok: true, updated: Object.keys({ ...clean, ...extra }), requires_reapproval: requiresReapproval };
  }
}
