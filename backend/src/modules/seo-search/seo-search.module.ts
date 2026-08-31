
/** Arabic/English search normalization: strip Arabic diacritics & tatweel, unify alef/hamza/yeh/teh-marbuta variants, NFKD + lowercase + collapse spaces. Pure, locale-safe. */
export function normalizeSearchText(input: string): string {
  return (input ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u06CC/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
/**
 * SEO + Global Search + Recommendations module.
 * Auto metadata per entity (slug/canonical/OG/Twitter/JSON-LD/breadcrumbs),
 * sitemap.xml + robots.txt, universal home search, recommendation engine.
 */
import { Module, Injectable, Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Response } from 'express';
import { Public } from '../../common/auth.guard';
import { resolveMedicinePublicDto, productLocaleToDb, PUBLIC_CATALOG_LOCALES } from '../medicines/med-i18n';

const SITE = process.env.API_PUBLIC_URL?.replace('/api/v1', '') || 'https://api.nabd.plus';
const SITE_NAME = 'نبض';

function slugify(s: string): string {
  return (s || '').trim().replace(/[\s_]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80);
}

@Injectable()
export class SeoSearchService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async metadata(type: string, id: string): Promise<any> {
    const entity = await this.loadEntity(type, id);
    if (!entity) return null;
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

  private async loadEntity(type: string, id: string): Promise<any> {
    if (type === 'category') return { id, is_category: true };
    const col = type === 'medicine' ? 'medicines_master' : type === 'article' ? 'articles' : 'provider_profiles';
    return this.conn.collection(col).findOne({ id }, { projection: { _id: 0 } });
  }

  private cdn(u?: string) {
    if (!u) return u;
    if (u.startsWith('http')) return u;
    return `${process.env.S3_PUBLIC_BASE_URL || 'https://cdn.nabd.plus'}/${u.replace(/^\//, '')}`;
  }

  private crumbs(url: string, items: Array<[string, string | null]>) {
    return {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: items.map(([name, link], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(link ? { item: link } : {}) })),
    };
  }

  private baseFields(type: string, e: any): any {
    switch (type) {
      case 'medicine': {
        const title = e.name_ar || e.name_en || 'منتج';
        const desc = [e.description_ar, e.active_ingredient ? `المادة الفعالة: ${e.active_ingredient}` : null, e.manufacturer ? `من ${e.manufacturer}` : null].filter(Boolean).join(' — ') || `${title} — متوفر في صيدلية ${SITE_NAME}`;
        return {
          title, description: desc, image: e.image ? this.cdn(e.image) : null, ogType: 'product', changefreq: 'weekly', priority: 0.8,
          jsonLd: (url: string, img: string) => ({
            '@context': 'https://schema.org', '@type': 'Product', name: title, description: desc, image: img, url,
            brand: e.manufacturer ? { '@type': 'Brand', name: e.manufacturer } : undefined,
            offers: e.price ? { '@type': 'Offer', price: e.price, priceCurrency: 'SAR', availability: e.availability_status === 'none' || !e.availability_status ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability' } : undefined,
          }),
          breadcrumbs: (url: string) => this.crumbs(url, [['الرئيسية', SITE], ['الصيدلية', `${SITE}/pharmacy`], [e.category || 'منتجات', null], [title, url]]),
        };
      }
      case 'article':
        return {
          title: e.title_ar || e.title || 'مقال',
          description: (e.excerpt_ar || e.content_ar || '').slice(0, 155) || `مقال طبي من ${SITE_NAME}`,
          image: e.image ? this.cdn(e.image) : null, ogType: 'article', changefreq: 'monthly', priority: 0.6,
          jsonLd: (url: string, img: string) => ({ '@context': 'https://schema.org', '@type': 'Article', headline: e.title_ar || e.title, image: img, url, author: { '@type': 'Organization', name: SITE_NAME } }),
          breadcrumbs: (url: string) => this.crumbs(url, [['الرئيسية', SITE], ['المقالات', `${SITE}/articles`], [e.title_ar || 'مقال', url]]),
        };
      case 'category':
        return {
          title: e.id, description: `تصفح منتجات ${e.id} في صيدلية ${SITE_NAME}`,
          image: null, ogType: 'website', changefreq: 'weekly', priority: 0.7,
          jsonLd: (url: string) => ({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: e.id, url }),
          breadcrumbs: (url: string) => this.crumbs(url, [['الرئيسية', SITE], ['الصيدلية', `${SITE}/pharmacy`], [e.id, url]]),
        };
      default: {
        const title = e.name || e.facility_name || e.full_name || 'مزود';
        const desc = [e.specialty, e.city, (e.bio || '').slice(0, 100)].filter(Boolean).join(' — ') || `${title} — مزود رعاية صحية في ${SITE_NAME}`;
        return {
          title, description: desc, image: e.photo_url || e.logo_url ? this.cdn(e.photo_url || e.logo_url) : null,
          ogType: 'profile', changefreq: 'weekly', priority: 0.7,
          jsonLd: (url: string, img: string) => ({ '@context': 'https://schema.org', '@type': type === 'doctor' ? 'Physician' : 'MedicalBusiness', name: title, description: desc, image: img, url, ...(e.specialty ? { medicalSpecialty: e.specialty } : {}) }),
          breadcrumbs: (url: string) => this.crumbs(url, [['الرئيسية', SITE], ['المزودون', `${SITE}/providers`], [title, url]]),
        };
      }
    }
  }

  async sitemapXml(): Promise<string> {
    const meds = await this.conn.collection('medicines_master')
      .find({ is_deleted: { $ne: true } }, { projection: { _id: 0, id: 1, slug: 1, name_ar: 1, updatedAt: 1 } })
      .sort({ usage_count: -1 }).limit(2000).toArray();
    const urls = meds.map((m: any) => {
      const slug = m.slug || slugify(`${m.name_ar || ''}-${String(m.id).slice(0, 6)}`);
      const lastmod = m.updatedAt ? new Date(m.updatedAt).toISOString().slice(0, 10) : '2026-07-01';
      return `  <url><loc>${SITE}/s/medicine/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  }

  private publicProductFilter() {
    return { is_deleted: { $ne: true }, public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved' } as any;
  }

  /** Strict per-locale public product DTO by slug (v14 catalog URLs /{lang}/p/{slug}). */
  async publicProductBySlug(locale: string, slug: string) {
    const db = productLocaleToDb(locale);
    const decoded = decodeURIComponent(slug || '').trim();
    if (!decoded) throw new NotFoundException('product_not_found');
    const med: any = await this.conn.collection('medicines_master').findOne(
      { ...this.publicProductFilter(), [`translations.${db}.slug`]: decoded },
      { projection: { _id: 0 } },
    ) || await this.conn.collection('medicines_master').findOne(
      { ...this.publicProductFilter(), slug: decoded },
      { projection: { _id: 0 } },
    );
    if (!med) throw new NotFoundException('product_not_found');
    return resolveMedicinePublicDto(med, locale);
  }

  /** Strict per-locale public product DTO by internal id (legacy URL migration). */
  async publicProductById(locale: string, id: string) {
    const med: any = await this.conn.collection('medicines_master').findOne(
      { ...this.publicProductFilter(), id },
      { projection: { _id: 0 } },
    );
    if (!med) throw new NotFoundException('product_not_found');
    return resolveMedicinePublicDto(med, locale);
  }

  /** Strict per-locale public product DTO by canonical SKU (AI-commerce lookup). */
  async publicProductBySku(sku: string, locale = 'ar') {
    const n = Number(sku);
    if (!Number.isFinite(n)) throw new NotFoundException('product_not_found');
    const med: any = await this.conn.collection('medicines_master').findOne(
      { ...this.publicProductFilter(), sku: n },
      { projection: { _id: 0 } },
    );
    if (!med) throw new NotFoundException('product_not_found');
    return resolveMedicinePublicDto(med, locale);
  }

  /**
   * AI-commerce product search: localized, buy-ready results with price,
   * availability, SKU and canonical URL per locale.
   */
  async publicProductSearch(q: string, locale = 'ar', limit = 20, page = 1) {
    const db = productLocaleToDb(locale);
    const term = (q || '').trim();
    const perPage = Math.min(Math.max(limit, 1), 50);
    const filter: any = { ...this.publicProductFilter() };
    if (term) {
      const rx = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filter.$or = [
        { name_ar: rx }, { name_en: rx }, { active_ingredient: rx },
        { [`translations.${db}.name`]: rx },
        { [`translations.${db}.search_aliases`]: rx },
        ...(Number.isFinite(Number(term)) ? [{ sku: Number(term) }] : []),
        { barcode: term },
      ];
    }
    const cursor = this.conn.collection('medicines_master')
      .find(filter, { projection: { _id: 0, interactions: 0, change_requests: 0 } } as any)
      .sort({ usage_count: -1 })
      .skip((Math.max(page, 1) - 1) * perPage)
      .limit(perPage);
    const [rows, total] = await Promise.all([cursor.toArray(), this.conn.collection('medicines_master').countDocuments(filter)]);
    return {
      query: term || null, locale, page: Math.max(page, 1), limit: perPage, total,
      items: rows.map((m: any) => {
        const dto = resolveMedicinePublicDto(m, locale);
        return {
          sku: dto.sku, id: dto.id, slug: dto.slug, name: dto.name, official_name: dto.official_name,
          description: dto.description, category: dto.category, sub_category: dto.sub_category,
          form: dto.form, strength: dto.strength, package_size: dto.package_size,
          active_ingredient: dto.active_ingredient, manufacturer: dto.manufacturer,
          price: dto.price, old_price: dto.old_price, currency: dto.currency,
          is_rx: dto.is_rx, available: dto.available, image: dto.image,
          url: `${process.env.WEB_PUBLIC_URL || 'https://nabd.plus'}/${locale}/p/${encodeURIComponent(String(dto.slug))}`,
        };
      }),
    };
  }

  /** Slug batches for the web sitemap index (paginated XML sitemaps). */
  async publicProductSitemapPage(locale: string, page: number, perPage = 5000) {
    const db = productLocaleToDb(locale);
    const rows = await this.conn.collection('medicines_master')
      .find(this.publicProductFilter(), { projection: { _id: 0, slug: 1, updatedAt: 1, [`translations.${db}.slug`]: 1 } } as any)
      .sort({ id: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .toArray();
    return rows.map((m: any) => ({
      slug: m?.translations?.[db]?.slug || m.slug,
      lastmod: m.updatedAt ? new Date(m.updatedAt).toISOString().slice(0, 10) : undefined,
    })).filter((r: any) => r.slug);
  }

  async publicProductCount(): Promise<number> {
    return this.conn.collection('medicines_master').countDocuments(this.publicProductFilter());
  }

  /** Category cluster tree with live counts per locale. */
  async publicCategories(locale: string) {
    const db = productLocaleToDb(locale);
    const key = (f: string) => db === 'ar' ? f : `translations.${db}.${f === 'category' ? 'main_category' : f}`;
    const rows = await this.conn.collection('medicines_master').aggregate([
      { $match: this.publicProductFilter() },
      { $group: { _id: { c: `$${key('category')}`, s: `$${key('sub_category')}` }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]).toArray();
    const tree: Record<string, { name: string; count: number; subs: Record<string, number> }> = {};
    for (const r of rows as any[]) {
      const c = r._id?.c; if (!c) continue;
      tree[c] = tree[c] || { name: c, count: 0, subs: {} };
      tree[c].count += r.n;
      if (r._id?.s) tree[c].subs[r._id.s] = (tree[c].subs[r._id.s] || 0) + r.n;
    }
    return { locale, categories: Object.values(tree) };
  }

  /** Paginated products inside a localized category cluster. */
  async publicCategoryProducts(locale: string, category: string, sub?: string, page = 1, limit = 24) {
    const db = productLocaleToDb(locale);
    const key = (f: string) => db === 'ar' ? f : `translations.${db}.${f === 'category' ? 'main_category' : f}`;
    const filter: any = { ...this.publicProductFilter(), [key('category')]: decodeURIComponent(category) };
    if (sub) filter[key('sub_category')] = decodeURIComponent(sub);
    const perPage = Math.min(Math.max(limit, 1), 48);
    const cursor = this.conn.collection('medicines_master')
      .find(filter, { projection: { _id: 0, id: 1, sku: 1, slug: 1, name_ar: 1, name_en: 1, price: 1, old_price: 1, image_1: 1, image: 1, form: 1, strength: 1, package_size: 1, category: 1, sub_category: 1, active_ingredient: 1, requires_prescription: 1, availability_status: 1, usage_count: 1, translations: 1 } } as any)
      .sort({ usage_count: -1 })
      .skip((Math.max(page, 1) - 1) * perPage)
      .limit(perPage);
    const [rows, total] = await Promise.all([cursor.toArray(), this.conn.collection('medicines_master').countDocuments(filter)]);
    return {
      locale, category: decodeURIComponent(category), sub_category: sub ? decodeURIComponent(sub) : null,
      page: Math.max(page, 1), limit: perPage, total,
      items: rows.map((m: any) => {
        const dto = resolveMedicinePublicDto(m, locale);
        return {
          sku: dto.sku, id: dto.id, slug: dto.slug, name: dto.name, form: dto.form, strength: dto.strength,
          package_size: dto.package_size, price: dto.price, old_price: dto.old_price, currency: dto.currency,
          is_rx: dto.is_rx, available: dto.available, image: dto.image,
        };
      }),
    };
  }

  async globalSearch(q: string, limit = 5): Promise<any> {
    const term = (q || '').trim();
    if (term.length < 2) return { query: q, results: {}, total: 0 };
    const rx = { $regex: term, $options: 'i' };
    const medProj = { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, image: 1, category: 1, manufacturer: 1 };
    const docProj = { _id: 0, id: 1, name: 1, full_name: 1, specialty: 1, photo_url: 1, rating: 1, city: 1 };
    const [medicines, doctors, pharmacies, hospitals, labs, services] = await Promise.all([
      this.conn.collection('medicines_master').find({ is_deleted: { $ne: true }, $or: [{ name_ar: rx }, { name_en: rx }, { active_ingredient: rx }, { search_text: rx }] } as any, { projection: medProj } as any).limit(limit).toArray(),
      this.conn.collection('provider_profiles').find({ provider_type: 'doctor', $or: [{ name: rx }, { full_name: rx }, { specialty: rx }] } as any, { projection: docProj } as any).limit(limit).toArray(),
      this.conn.collection('provider_profiles').find({ provider_type: 'pharmacy', $or: [{ name: rx }, { facility_name: rx }] } as any, { projection: { _id: 0, id: 1, name: 1, facility_name: 1, city: 1, logo_url: 1 } } as any).limit(limit).toArray(),
      this.conn.collection('provider_profiles').find({ provider_type: { $in: ['hospital', 'clinic', 'medical_center'] }, $or: [{ name: rx }, { facility_name: rx }] } as any, { projection: { _id: 0, id: 1, name: 1, facility_name: 1, city: 1 } } as any).limit(limit).toArray(),
      this.conn.collection('provider_profiles').find({ provider_type: { $in: ['lab', 'laboratory'] }, $or: [{ name: rx }, { facility_name: rx }] } as any, { projection: { _id: 0, id: 1, name: 1, facility_name: 1, city: 1 } } as any).limit(limit).toArray(),
      this.conn.collection('homecareservices').find({ $or: [{ name_ar: rx }, { name_en: rx }] } as any, { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1 } } as any).limit(limit).toArray().catch(() => []),
    ]);
    const total = medicines.length + doctors.length + pharmacies.length + hospitals.length + labs.length + (services || []).length;

    // ── Ranking: exact > prefix > substring, then popularity ──
    const norm = term.toLowerCase();
    const rank = (getNames: (x: any) => string[], popField = 'usage_count') => (a: any, b: any) => {
      const score = (x: any) => {
        const names = getNames(x).map((n: string) => (n || '').toLowerCase());
        if (names.some(n => n === norm)) return 100;
        if (names.some(n => n.startsWith(norm))) return 60;
        if (names.some(n => n.includes(norm))) return 30;
        return 0;
      };
      return (score(b) + (b[popField] || 0) / 100) - (score(a) + (a[popField] || 0) / 100);
    };

    // ── Search intent: boost the most likely entity group first ──
    const looksIngredient = medicines.length > 0 && medicines.some((m: any) => (m.active_ingredient || '').toLowerCase().includes(norm));
    const intent = looksIngredient ? 'medicine'
      : doctors.length > 0 && doctors.some((d: any) => (d.specialty || '').toLowerCase().includes(norm)) ? 'doctor'
      : 'general';

    return {
      query: term, total,
      intent,
      results: {
        medicines: medicines.sort(rank((m: any) => [m.name_ar, m.name_en, m.active_ingredient])).map((m: any) => ({ ...m, _type: 'medicine' })),
        doctors: doctors.sort(rank((d: any) => [d.name, d.full_name, d.specialty], 'rating')).map((d: any) => ({ ...d, _type: 'doctor' })),
        pharmacies: pharmacies.sort(rank((p: any) => [p.name, p.facility_name])).map((p: any) => ({ ...p, _type: 'pharmacy' })),
        hospitals: hospitals.map((h: any) => ({ ...h, _type: 'hospital' })),
        labs: labs.map((l: any) => ({ ...l, _type: 'laboratory' })),
        services: (services || []).map((s: any) => ({ ...s, _type: 'service' })),
      },
      boost_order: intent === 'medicine' ? ['medicines', 'pharmacies', 'doctors'] : intent === 'doctor' ? ['doctors', 'hospitals', 'medicines'] : ['medicines', 'doctors', 'pharmacies'],
    };
  }

  /**
   * Recommendation chain (exact spec order):
   * same active ingredient → (if none) category → usage/tags → brand → popularity.
   * Every candidate carries a weighted score so the client can sort/annotate,
   * and the structure is AI-ranking ready (score breakdown exposed).
   */
  async medicineRecommendations(id: string, limit = 12): Promise<any> {
    const med: any = await this.conn.collection('medicines_master').findOne({ id, is_deleted: { $ne: true } }, { projection: { _id: 0 } });
    if (!med) return { strategy: 'none', items: [] };
    const card = { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, old_price: 1, image: 1, manufacturer: 1, brand: 1, requires_prescription: 1, form: 1, strength: 1, active_ingredient: 1, category: 1, sub_category: 1, usage_count: 1, availability_status: 1 };

    // Scored candidate pool: each match type adds to the weighted score
    const score = new Map<string, { item: any; score: number; reasons: string[] }>();
    const add = (item: any, points: number, reason: string) => {
      if (!item?.id || item.id === id) return;
      const cur = score.get(item.id) || { item, score: 0, reasons: [] };
      cur.score += points;
      if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
      score.set(item.id, cur);
    };

    const queries: Array<Promise<any>> = [];
    // 1) Same active ingredient (strongest)
    if (med.active_ingredient) {
      queries.push(this.conn.collection('medicines_master').find({ active_ingredient: med.active_ingredient, is_deleted: { $ne: true } } as any, { projection: card } as any).limit(20).toArray()
        .then(rows => rows.forEach(r => add(r, 50, 'نفس المادة الفعالة'))));
    }
    // 2) Same strength/dosage (within ingredient match)
    if (med.active_ingredient && med.strength) {
      queries.push(this.conn.collection('medicines_master').find({ active_ingredient: med.active_ingredient, strength: med.strength, is_deleted: { $ne: true } } as any, { projection: card } as any).limit(10).toArray()
        .then(rows => rows.forEach(r => add(r, 15, 'نفس التركيز'))));
    }
    // 3) Same category + sub_category (usage similarity)
    queries.push(this.conn.collection('medicines_master').find({ category: med.category, sub_category: med.sub_category, is_deleted: { $ne: true } } as any, { projection: card } as any).limit(20).toArray()
      .then(rows => rows.forEach(r => add(r, med.active_ingredient ? 10 : 30, 'نفس الفئة والاستخدام'))));
    // 4) Same brand/manufacturer
    const brand = med.brand || med.manufacturer;
    if (brand) {
      queries.push(this.conn.collection('medicines_master').find({ $or: [{ brand }, { manufacturer: brand }], is_deleted: { $ne: true } } as any, { projection: card } as any).limit(15).toArray()
        .then(rows => rows.forEach(r => add(r, 8, 'نفس البراند'))));
    }
    // 5) Popularity boost (usage_count percentile)
    queries.push(this.conn.collection('medicines_master').find({ category: med.category, is_deleted: { $ne: true } } as any, { projection: card } as any).sort({ usage_count: -1 }).limit(10).toArray()
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

  async doctorRecommendations(id: string, limit = 10): Promise<any> {
    const doc: any = await this.conn.collection('provider_profiles').findOne({ id, provider_type: 'doctor' } as any, { projection: { _id: 0 } });
    if (!doc) return { same_specialty: [], nearby: [] };
    const card = { _id: 0, id: 1, name: 1, full_name: 1, specialty: 1, photo_url: 1, rating: 1, city: 1, consultation_price: 1 };
    const [sameSpecialty, nearby] = await Promise.all([
      doc.specialty
        ? this.conn.collection('provider_profiles').find({ provider_type: 'doctor', specialty: doc.specialty, id: { $ne: id } } as any, { projection: card } as any).sort({ rating: -1 }).limit(limit).toArray()
        : Promise.resolve([]),
      doc.city
        ? this.conn.collection('provider_profiles').find({ provider_type: 'doctor', city: doc.city, id: { $ne: id } } as any, { projection: card } as any).sort({ rating: -1 }).limit(limit).toArray()
        : Promise.resolve([]),
    ]);
    return { same_specialty: sameSpecialty, nearby, ranking: 'specialty>nearby>rating (AI-rank ready)' };
  }
}

@Controller()
export class SeoSearchController {
  constructor(private readonly svc: SeoSearchService) {}


  @Public()
  @Get('sitemap.xml')
  async sitemap(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(await this.svc.sitemapXml());
  }

  @Public()
  @Get('robots.txt')
  robots(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *\nAllow: /s/\nAllow: /sitemap.xml\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);
  }

  /** Site-wide structured data (Organization + LocalBusiness + FAQ) for the future site shell. */
  @Public()
  @Get('seo/site/organization')
  organization(): any {
    return {
      '@context': 'https://schema.org', '@type': 'Organization', name: 'نبض', url: SITE,
      logo: `${SITE}/logo.png`,
      sameAs: [],
      contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', availableLanguage: ['ar', 'en'] }],
    };
  }

  @Public()
  @Get('seo/site/local-business')
  localBusiness(): any {
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

  @Public()
  @Get('seo/site/faq')
  faqSchema(): any {
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

  @Public()
  @Get('seo/:type/:id')
  seo(@Param('type') type: string, @Param('id') id: string) {
    return this.svc.metadata(type, id);
  }


  /** hreflang alternates for the future web pages. */
  @Public()
  @Get('seo/:type/:id/hreflang')
  hreflang(@Param('type') type: string, @Param('id') id: string): any {
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

  /** AI-search readiness: llms.txt guidance for LLM crawlers. */
  @Public()
  @Get('llms.txt')
  llmsTxt(@Res() res: Response) {
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
      `## AI-commerce (catalog v14)\n` +
      `- GET ${SITE}/api/v1/public/products/search?q={term}&locale={ar|en|ur|hi|bn|fil} — بحث منتجات مترجم بالكامل (SKU/سعر/توفر/رابط شراء)\n` +
      `- GET ${SITE}/api/v1/public/products/by-sku/{sku}?locale={lang} — منتج برقم SKU\n` +
      `- GET ${SITE}/api/v1/public/product/{locale}/{slug} — DTO عام صارم اللغة (لا خلط بين اللغات)\n` +
      `- GET ${SITE}/api/v1/public/categories/{locale} — شجرة الفئات مع الأعداد\n\n` +
      `## ملاحظات\n` +
      `- المحتوى ثنائي اللغة (العربية أساسياً والإنجليزية ثانوياً) مع ترجمات ur/hi/bn/tl.\n` +
      `- الأسعار بالريال السعودي (SAR).\n`);
  }

  /** Image sitemap — product images index for Google Images. */
  @Public()
  @Get('image-sitemap.xml')
  async imageSitemap(@Res() res: Response) {
    const meds = await (this.svc as any).conn.collection('medicines_master')
      .find({ is_deleted: { $ne: true }, image: { $ne: null } }, { projection: { _id: 0, id: 1, name_ar: 1, slug: 1, image: 1 } } as any)
      .sort({ usage_count: -1 }).limit(1500).toArray();
    const cdn = (u: string) => u?.startsWith('http') ? u : `${process.env.S3_PUBLIC_BASE_URL || 'https://cdn.nabd.plus'}/${u}`;
    const urls = meds.map((m: any) => {
      const slug = m.slug || m.id;
      return `  <url><loc>${SITE}/s/medicine/${slug}</loc><image:image><image:loc>${cdn(m.image)}</image:loc><image:title>${(m.name_ar || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</image:title></image:image></url>`;
    });
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`);
  }

  @Public()
  @Get('search/global')
  globalSearch(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.svc.globalSearch(q || '', parseInt(limit || '5'));
  }

  @Public()
  @Get('medicines/:id/recommendations')
  medicineRecommendations(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.svc.medicineRecommendations(id, parseInt(limit || '12'));
  }

  @Public()
  @Get('doctors/:id/recommendations')
  doctorRecommendations(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.svc.doctorRecommendations(id, parseInt(limit || '10'));
  }

  // ── Catalog v14 public product surface (SEO/AEO/GEO + AI-commerce) ──

  /** Strict per-locale product DTO by that locale's slug. Powers /{lang}/p/{slug}. */
  @Public()
  @Get('public/product/:locale/:slug')
  publicProduct(@Param('locale') locale: string, @Param('slug') slug: string) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    return this.svc.publicProductBySlug(locale, slug);
  }

  /** AI-commerce: localized product search. */
  @Public()
  @Get('public/products/search')
  publicProductsSearch(
    @Query('q') q?: string,
    @Query('locale') locale?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const loc = (PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale || '') ? locale! : 'ar';
    return this.svc.publicProductSearch(q || '', loc, parseInt(limit || '20'), parseInt(page || '1'));
  }

  /** Legacy id-based lookup (redirects legacy /medicines/:id pages to /p/{slug}). */
  @Public()
  @Get('public/product-by-id/:locale/:id')
  publicProductById(@Param('locale') locale: string, @Param('id') id: string) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    return this.svc.publicProductById(locale, id);
  }

  /** AI-commerce: canonical SKU lookup. */
  @Public()
  @Get('public/products/by-sku/:sku')
  publicProductSku(@Param('sku') sku: string, @Query('locale') locale?: string) {
    const loc = (PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale || '') ? locale! : 'ar';
    return this.svc.publicProductBySku(sku, loc);
  }

  /** Category cluster tree (per locale, live counts). */
  @Public()
  @Get('public/categories/:locale')
  publicCategories(@Param('locale') locale: string) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    return this.svc.publicCategories(locale);
  }

  /** Category cluster products. */
  @Public()
  @Get('public/categories/:locale/items')
  publicCategoryProducts(
    @Param('locale') locale: string,
    @Query('category') category?: string,
    @Query('sub') sub?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    if (!category) throw new NotFoundException('category_required');
    return this.svc.publicCategoryProducts(locale, category, sub, parseInt(page || '1'), parseInt(limit || '24'));
  }

  /** Product sitemap page as JSON (the web app renders same-host XML). */
  @Public()
  @Get('public/sitemaps/products/:locale/:page')
  async publicProductSitemap(@Param('locale') locale: string, @Param('page') page: string) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    const p = Math.max(parseInt(page || '1'), 1);
    const [urls, total] = await Promise.all([this.svc.publicProductSitemapPage(locale, p), this.svc.publicProductCount()]);
    return { locale, page: p, per_page: 5000, total, pages: Math.max(Math.ceil(total / 5000), 1), urls };
  }
}

@Module({
  controllers: [SeoSearchController],
  providers: [SeoSearchService],
})
export class SeoSearchModule {}
