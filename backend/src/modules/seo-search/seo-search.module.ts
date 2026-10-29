
import { popularPage } from '../product-ranking/product-ranking.service';
import { BackfillSlugsDto } from './seo-search.dto';
import { safeDecode } from '../../common/slug.util';
import { buildMedicineReport, medicineReportMarkdown } from './medicine-publication-report';
import { publicMedicineFilter } from '../medicines/public-medicine-filter';
/** Arabic/English search normalization: strip Arabic diacritics & tatweel, unify alef/hamza/yeh/teh-marbuta variants, NFKD + lowercase + collapse spaces. Pure, locale-safe. */
export function normalizeSearchText(input: string): string {
  return (input ?? "")
    // Control characters (NUL, C0/C1) never belong in a search and MongoDB rejects a NUL in a regex.
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
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

/** Common medical active ingredients and symptoms mapping across Arabic, English, and South Asian / regional languages */
export const MULTILINGUAL_SYNONYM_MAP: Array<{ canonical: string; variants: string[] }> = [
  {
    canonical: 'paracetamol',
    variants: [
      'paracetamol', 'acetaminophen', 'panadol', 'adol', 'fevadol',
      'باراسيتامول', 'بنادول', 'ففادول', 'ادول', 'باراسيتامول',
      'پیراسیٹامول', 'پیناڈول', 'پیراسیٹامول', // Urdu
      'पैरासिटामोल', 'पेनाडोल', // Hindi
      'প্যারাসিটামল', 'প্যানাডল', // Bengali
      'parasetamol', // Filipino
    ]
  },
  {
    canonical: 'ibuprofen',
    variants: [
      'ibuprofen', 'brufen', 'advil', 'motrin',
      'ايبوبروفين', 'بروفين', 'ادفيل',
      'آئیبوپروفین', 'بروفین', // Urdu
      'इबुप्रोफेन', 'ब्रुफेन', // Hindi
      'আইবুপ্রোফেন', // Bengali
      'ibupropen', // Filipino
    ]
  },
  {
    canonical: 'amoxicillin',
    variants: [
      'amoxicillin', 'amoxil', 'augmentin', 'amoxicilline',
      'اموكسيسيلين', 'اموكسيل', 'اوجمنتين', 'اوجمينتين',
      'اموکسیسیلین', 'اوگمنٹن', // Urdu
      'एमोक्सिसिलिन', 'ऑगमेंटिन', // Hindi
      'অ্যামোক্সিসিলিন', 'অগমেন্টিন', // Bengali
    ]
  },
  {
    canonical: 'omeprazole',
    variants: [
      'omeprazole', 'losec', 'prilosec', 'gasec',
      'اوميبرازول', 'لوسيك', 'جاسيك',
      'اومیپرازول', // Urdu
      'ओमेप्राजोल', // Hindi
      'ওমেপ্রাজল', // Bengali
    ]
  },
  {
    canonical: 'metformin',
    variants: [
      'metformin', 'glucophage',
      'ميتفورمين', 'جلوكوفاج', 'كلوفاج',
      'میٹفارمین', 'گلوکوفیج', // Urdu
      'मेटफॉर्मिन', 'ग्लूकोफेज', // Hindi
      'মেটফর্মিন', // Bengali
    ]
  },
  {
    canonical: 'cetirizine',
    variants: [
      'cetirizine', 'zyrtec',
      'سيتريزين', 'زيرتيك', 'زرتيك',
      'سیٹریزین', 'زرٹیک', // Urdu
      'सेटिरिज़िन', 'ज़िरटेक', // Hindi
      'সেটিরিজিন', // Bengali
    ]
  },
  {
    canonical: 'loratadine',
    variants: [
      'loratadine', 'claritin',
      'لوراتادين', 'كلاريتين',
      'لوراٹاڈین', 'کلاریٹن', // Urdu
      'लोराटाडीन', 'क्लैरिटिन', // Hindi
      'লোরাটাডিন', // Bengali
    ]
  },
  {
    canonical: 'vitamin c',
    variants: [
      'vitamin c', 'ascorbic acid', 'cevitil', 'redoxon',
      'فيتامين سي', 'فيتامين ج', 'حمض الاسكوربيك',
      'وٹامن سی', // Urdu
      'विटामिन सी', // Hindi
      'ভিটামিন সি', // Bengali
    ]
  },
  {
    canonical: 'vitamin d',
    variants: [
      'vitamin d', 'cholecalciferol', 'vidrop',
      'فيتامين د', 'كوليكالسيفيرول', 'فيدروب',
      'وٹامن ڈی', // Urdu
      'विटामिन डी', // Hindi
      'ভিটামিন ডি', // Bengali
    ]
  }
];

/** Expands a query term into multilingual aliases for active ingredients and popular synonyms. */
export function expandMultilingualSearchTerms(input: string): string[] {
  const norm = normalizeSearchText(input || '');
  if (!norm || norm.length < 2) return norm ? [norm] : [];
  const expanded = new Set<string>([norm]);
  for (const entry of MULTILINGUAL_SYNONYM_MAP) {
    const matches = entry.variants.some((v) => {
      const nv = normalizeSearchText(v);
      return nv === norm || (norm.length >= 3 && (nv.includes(norm) || norm.includes(nv)));
    });
    if (matches) {
      for (const v of entry.variants) {
        const nv = normalizeSearchText(v);
        if (nv) expanded.add(nv);
      }
    }
  }
  return Array.from(expanded);
}

/**
 * Auto metadata per entity (slug/canonical/OG/Twitter/JSON-LD/breadcrumbs),
 * sitemap.xml + robots.txt, universal home search, recommendation engine.
 */
import { Module, Injectable, Controller, Get, Post, Body, NotFoundException, Param, Query, Res, Optional, UseInterceptors } from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Response } from 'express';
import { Public, Roles } from '../../common/auth.guard';
import { PublicCache } from '../../common/public-cache.decorator';
import { UserRole } from '../../common/enums';
import { AutoEntitySeoPipelineService, PipelineEntityType } from '../events/auto-entity-seo-pipeline.service';
import { PUBLIC_MEDICINE, PUBLIC_TYPED_PROVIDER } from '../entity-graph/entity-graph.service';
import { resolveMedicinePublicDto, productLocaleToDb, PUBLIC_CATALOG_LOCALES } from '../medicines/med-i18n';
import { catalogueFilterClauses, CatalogueFilterInput } from './catalogue-filters';
import { toPublicMedicine, toPublicProductCard } from '../medicines/public-medicine';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { EquivalentRow, ingredientCandidatePattern, ingredientParts, rankEquivalents } from './product-equivalents';
import { comparePower } from '../medicines/variant-grouping';

/** What a variant row of the picker needs (decision D): names and slugs per locale, price, availability, pictures. */
const VARIANT_PROJECTION: Record<string, 0 | 1> = {
  _id: 0, id: 1, sku: 1, slug: 1, name_ar: 1, name_en: 1, price: 1, old_price: 1, requires_prescription: 1, is_rx: 1,
  online_exclusive: 1, availability_status: 1, images: 1, image: 1, image_1: 1, image_2: 1, image_3: 1, image_4: 1, image_5: 1,
  variant: 1, variant_group: 1,
  ...Object.fromEntries(['ar', 'en', 'ur', 'hi', 'bn', 'tl'].flatMap((l) => [[`translations.${l}.name`, 1], [`translations.${l}.slug`, 1]])),
};
// P5.3: merged from SeoModule (seo/ → seo-search/)
import { MedicineSchema } from '../../schemas/medicine.schema';
import { LabServiceSchema } from '../../schemas/lab.schema';
import { HomeCareServiceSchema } from '../../schemas/home-care.schema';
import { FacilitySchema } from '../../schemas/facility.schema';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { ArticleSchema } from '../../schemas/article.schema';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';
import { IndexNowService } from './indexnow.service';
import { SeoIndexingListener } from './seo-indexing.listener';
import { SeoIndexingService } from './seo-indexing.service';
import { publicIndexableFilter, siteOrigin } from './seo-public-urls';
import { RedisCacheInterceptor } from '../../common/redis-cache.interceptor';
import { Throttle } from '@nestjs/throttler';
import { FacilityRepository } from './seo-repositories/facility.repository';
import { HomeCareServiceRepository } from './seo-repositories/homecareservice.repository';
import { LabServiceRepository } from './seo-repositories/labservice.repository';
import { MedicineRepository } from './seo-repositories/medicine.repository';
import { ProviderProfileRepository } from './seo-repositories/providerprofile.repository';
import { ArticleRepository } from './seo-repositories/article.repository';

import { Permission, RequirePermissions } from '../../common/permissions';
import { timedFetch } from '../../common/external-call';
import { NOT_PROMOTABLE_FILTER } from '../medicines/promotion-rules';
/** Orders of the public catalogue (#816); anything else is the default popularity order. */
export const CATALOGUE_SORTS = ['popular', 'most_ordered', 'price_asc', 'price_desc', 'newest'] as const;
export type CatalogueSort = (typeof CATALOGUE_SORTS)[number];

const SITE = process.env.API_PUBLIC_URL?.replace('/api/v1', '') || 'https://api.nabd.plus';
const SITE_NAME = 'نبض';

/** P13-R16: long-standing default site FAQ (fallback when the faqs collection is empty). */
export const SITE_FAQ_DEFAULTS = [
  { '@type': 'Question', name: 'هل الطلب يحتاج وصفة طبية؟', acceptedAnswer: { '@type': 'Answer', text: 'الأدوية المميزة بشارة RX فقط تتطلب رفع روشتة قبل إتمام الدفع.' } },
  { '@type': 'Question', name: 'هل يمكن الطلب كضيف؟', acceptedAnswer: { '@type': 'Answer', text: 'نعم — التصفح والبحث والطلب والحجز متاحة للضيوف، والتأمين والعائلة يتطلبان حساباً.' } },
  { '@type': 'Question', name: 'كيف تصل الصور والمنتجات؟', acceptedAnswer: { '@type': 'Answer', text: 'صور المنتجات تُقدَّم عبر CDN عالمي، والمنتجات من كتالوج 21,000+ صنف موثق.' } },
  { '@type': 'Question', name: 'ماذا يعني "قد يكون غير متوفر"؟', acceptedAnswer: { '@type': 'Answer', text: 'شارة تحذيرية تظهر بعد اعتماد الإدارة لبلاغ نقص من الصيدليات — المنتج يبقى قابلاً للطلب.' } },
];

/**
 * P13-R16: "Cite this" block for medical/drug pages — plain text plus BibTeX
 * carrying the URL, the author and the access timestamp. BibTeX-unsafe
 * characters are stripped so the entry always parses.
 */
export function buildCitation(input: { title: string; author: string; url: string; date?: Date | string }): { text: string; bibtex: string } {
  const title = String(input?.title || '').trim() || 'Untitled';
  const author = String(input?.author || '').trim() || SITE_NAME;
  const url = String(input?.url || '').trim();
  const at = input?.date ? new Date(input.date) : new Date();
  const stamp = Number.isNaN(at.getTime()) ? new Date() : at;
  const accessed = stamp.toISOString().slice(0, 10);
  const text = `${author}. ${title}. ${SITE_NAME}. ${url} (accessed ${accessed}).`;
  const safe = (s: string) => String(s).replace(/[{}"\\]/g, '').slice(0, 300);
  const key = `nabdplus-${accessed.replace(/-/g, '')}-${Math.abs([...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) % 10000)}`;
  const bibtex = `@online{${key},\n  title = {${safe(title)}},\n  author = {${safe(author)}},\n  url = {${safe(url)}},\n  urldate = {${accessed}}\n}`;
  return { text, bibtex };
}

function slugify(s: string): string {
  return (s || '').trim().replace(/[\s_]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80);
}

@Injectable()
export class SeoSearchService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  /** The database connection, for read-only reports built outside this service. */
  connection(): Connection {
    return this.conn;
  }
  // R49: sitemap pages are 5000-doc reads (~10-12s live). Slugs change only via
  // backfill/indexing, so a 6h in-process cache is safe. Zero new deps by design.
  private readonly sitemapCache = new Map<string, { exp: number; stale?: number; val: any }>();
  private static readonly SITEMAP_TTL_MS = 6 * 60 * 60 * 1000;

  /** F23: live medicine count for llms.txt (cached 1h). */
  private catalogCountCache = { exp: 0, val: 0 };
  async catalogCount(): Promise<number> {
    if (Date.now() < this.catalogCountCache.exp) return this.catalogCountCache.val;
    // The advertised product count (llms.txt) counts the public catalogue only.
    const n = await this.conn.collection(CATALOG_COLLECTIONS.medicines).countDocuments(this.publicProductFilter()).catch(() => 0);
    this.catalogCountCache = { exp: Date.now() + 3600_000, val: n };
    return n;
  }

  /**
   * P14.3: the number of public products, the `total` of every catalogue page without a search term. It was a
   * countDocuments over the whole catalogue on each page (the second-largest Mongo cost in the 2026-10-16 capacity run).
   * Kept 60 s in the process; concurrent misses share one count. A publish shows in the total within a minute; the
   * items themselves are always read live.
   */
  private readonly publicCountCache = new Map<string, { exp: number; staleUntil: number; val?: number; pending: Promise<number> | null }>();
  private static readonly COUNT_FRESH_MS = 5 * 60_000;
  private static readonly COUNT_STALE_MS = 60 * 60_000;
  private publicListingCount(filter: any): Promise<number> {
    // One entry per distinct filter (category, sub-category or search term), so a category page reuses its own total.
    const key = JSON.stringify(filter, (_k, v) => (v instanceof RegExp ? String(v) : v));
    const now = Date.now();
    const c = this.publicCountCache.get(key);
    // Stale-while-revalidate (2026-10-27): a total a few minutes old is shown at once and refreshed behind the response, so only the
    // very first ask of a filter waits for the count (and that count is answered from an index, see medicine.schema.ts).
    if (c?.val !== undefined && now < c.exp) return Promise.resolve(c.val);
    if (c?.pending) return c.val !== undefined && now < c.staleUntil ? Promise.resolve(c.val) : c.pending;
    if (this.publicCountCache.size >= 500) {
      for (const [k, v] of this.publicCountCache) if (!v.pending && v.staleUntil <= now) this.publicCountCache.delete(k);
      if (this.publicCountCache.size >= 500) this.publicCountCache.clear();
    }
    const pending: Promise<number> = this.conn.collection(CATALOG_COLLECTIONS.medicines).countDocuments(filter)
      .then((n) => { const t = Date.now(); this.publicCountCache.set(key, { exp: t + SeoSearchService.COUNT_FRESH_MS, staleUntil: t + SeoSearchService.COUNT_STALE_MS, val: n, pending: null }); return n; })
      .catch((e) => { if (c?.val !== undefined) this.publicCountCache.set(key, { ...c, pending: null }); else this.publicCountCache.delete(key); throw e; });
    this.publicCountCache.set(key, { exp: c?.exp ?? 0, staleUntil: c?.staleUntil ?? 0, val: c?.val, pending });
    if (c?.val !== undefined && now < c.staleUntil) { pending.catch(() => undefined); return Promise.resolve(c.val); }
    return pending;
  }

  /**
   * P13-R16: "Cite this" block for medical/drug pages (plain text + BibTeX
   * with URL, author and access timestamp). Pure and exported for tests.
   */
  async metadata(type: string, id: string): Promise<any> {
    const entity = await this.loadEntity(type, id);
    if (!entity) return null;
    const base = this.baseFields(type, entity);
    const slug = entity.slug || slugify(`${base.title}-${String(entity.id || id).slice(0, 6)}`);
    const canonical = `${SITE}/s/${type}/${slug}`;
    const description = base.description.slice(0, 155);
    const image = base.image || `${SITE}/og-default.png`;
    const author = type === 'medicine'
      ? entity.manufacturer || SITE_NAME
      : type === 'article'
        ? entity.author_name || SITE_NAME
        : entity.name || entity.full_name || SITE_NAME;
    const stamp = entity.updatedAt || entity.published_at || entity.last_reviewed || new Date();
    return {
      type, id: entity.id, slug, canonical_url: canonical,
      page_title: `${base.title} | ${SITE_NAME}`,
      meta_description: description,
      citation: buildCitation({ title: base.title, author: String(author), url: canonical, date: stamp }),
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

  /**
   * P13-R16: site FAQPage driven by the admin-managed faqs collection, with
   * the long-standing default copy as fallback when the collection is empty.
   */
  async siteFaqJsonLd(): Promise<any> {
    try {
      const rows: any[] = await this.conn.collection('faqs')
        .find({ active: { $ne: false } })
        .sort({ sort: 1 })
        .limit(20)
        .toArray();
      const items = (rows || [])
        .filter((r: any) => r?.question_ar && r?.answer_ar)
        .map((r: any) => ({
          '@type': 'Question',
          name: String(r.question_ar),
          acceptedAnswer: { '@type': 'Answer', text: String(r.answer_ar) },
        }));
      if (items.length > 0) {
        return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items };
      }
    } catch { /* fall through to defaults */ }
    return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: SITE_FAQ_DEFAULTS };
  }

  private async loadEntity(type: string, id: string): Promise<any> {
    if (type === 'category') return { id, is_category: true };
    const col = type === 'medicine' ? CATALOG_COLLECTIONS.medicines : type === 'article' ? 'articles' : 'provider_profiles';
    // Public SEO metadata: a medicine still in medical review has no public page.
    const gate = type === 'medicine' ? this.publicProductFilter() : {};
    return this.conn.collection(col).findOne({ ...gate, id }, { projection: { _id: 0 } });
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
        // P13-R16: the commerce node is unchanged; the Drug node carries the
        // medical semantics (validators accept @graph with both types).
        const product = (url: string, img: string) => ({
          '@context': 'https://schema.org', '@type': 'Product', name: title, description: desc, image: img, url,
          brand: e.manufacturer ? { '@type': 'Brand', name: e.manufacturer } : undefined,
          offers: e.price ? { '@type': 'Offer', price: e.price, priceCurrency: 'SAR', availability: e.availability_status === 'none' || !e.availability_status ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability' } : undefined,
        });
        const drug = (url: string) => ({
          '@context': 'https://schema.org', '@type': 'Drug', name: title, description: desc, url,
          ...(e.active_ingredient ? { activeIngredient: e.active_ingredient } : {}),
          ...(e.manufacturer ? { manufacturer: { '@type': 'Organization', name: e.manufacturer } } : {}),
          ...(e.dosage_form || e.form ? { dosageForm: e.dosage_form || e.form } : {}),
        });
        return {
          title, description: desc, image: e.image ? this.cdn(e.image) : null, ogType: 'product', changefreq: 'weekly', priority: 0.8,
          jsonLd: (url: string, img: string) => ({ '@context': 'https://schema.org', '@graph': [product(url, img), drug(url)] }),
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

  /**
   * On-site visibility (product page, catalogue, search, alternatives): published = public_eligibility and an approved
   * medical review, as medicine-publication-report.ts defines it. indexing_eligibility only decides sitemaps, IndexNow
   * and llms.txt (indexableProductFilter); requiring it here hid every medicine the admin approved (approve() leaves it
   * false), so an item added in the admin never reached patients. A page that is not indexable says noindex.
   */
  private publicProductFilter() {
    return publicMedicineFilter() as any;
  }

  /** Search-engine surfaces (sitemaps, product count for them): published and indexing_eligibility. */
  private indexableProductFilter() {
    return { ...this.publicProductFilter(), indexing_eligibility: true } as any;
  }

  /** Strict per-locale public product DTO by slug (v14 catalog URLs /{lang}/p/{slug}). */
  async publicProductBySlug(locale: string, slug: string) {
    const db = productLocaleToDb(locale);
    const decoded = safeDecode(slug || '').trim();
    if (!decoded) throw new NotFoundException('product_not_found');
    const med: any = await this.conn.collection(CATALOG_COLLECTIONS.medicines).findOne(
      { ...this.publicProductFilter(), [`translations.${db}.slug`]: decoded },
      { projection: { _id: 0 } },
    ) || await this.conn.collection(CATALOG_COLLECTIONS.medicines).findOne(
      { ...this.publicProductFilter(), slug: decoded },
      { projection: { _id: 0 } },
    // A product with no slug at all is linked by its id (`slugs[locale]` falls back to it), so the id must resolve too.
    ) || await this.conn.collection(CATALOG_COLLECTIONS.medicines).findOne(
      { ...this.publicProductFilter(), id: decoded },
      { projection: { _id: 0 } },
    );
    if (!med) throw new NotFoundException('product_not_found');
    return resolveMedicinePublicDto(med, locale);
  }

  /** Strict per-locale public product DTO by internal id (legacy URL migration). */
  async publicProductById(locale: string, id: string) {
    const med: any = await this.conn.collection(CATALOG_COLLECTIONS.medicines).findOne(
      { ...this.publicProductFilter(), id },
      { projection: { _id: 0 } },
    );
    if (!med) throw new NotFoundException('product_not_found');
    return resolveMedicinePublicDto(med, locale);
  }

  /**
   * Decision D (issue 1556): the variants of a product (one product in several powers, colours or shades), each its
   * own published record with its own SKU, price and picture. Same visibility as the product page (publicProductFilter)
   * and the same per-locale projection (resolveMedicinePublicDto). Sorted for the picker: colour or shade, then power
   * (plano, minus from −0.25 down, then plus), then the stored order.
   */
  async publicProductVariants(locale: string, id: string) {
    const col = this.conn.collection(CATALOG_COLLECTIONS.medicines);
    const med: any = await col.findOne({ ...this.publicProductFilter(), id }, { projection: { _id: 0, id: 1, variant_group: 1 } });
    if (!med) throw new NotFoundException('product_not_found');
    if (!med.variant_group) return { id, variant_group: null, kind: null, variants: [] };
    const rows: any[] = await col
      .find({ ...this.publicProductFilter(), variant_group: med.variant_group }, { projection: VARIANT_PROJECTION } as any)
      .limit(1000)
      .toArray();
    const variants = rows.map((m) => {
      const dto = resolveMedicinePublicDto(m, locale);
      return {
        id: dto.id, sku: dto.sku, slug: dto.slug, name: dto.name, price: dto.price, old_price: dto.old_price, currency: dto.currency,
        is_rx: dto.is_rx, online_exclusive: dto.online_exclusive, available: dto.available, availability_status: dto.availability_status,
        image: dto.image, variant: dto.variant,
      };
    }).filter((v) => v.variant);
    variants.sort((a, b) => String(a.variant!.colour || a.variant!.shade || '').localeCompare(String(b.variant!.colour || b.variant!.shade || ''))
      || comparePower(a.variant!.power ?? undefined, b.variant!.power ?? undefined)
      || a.variant!.position - b.variant!.position);
    const kinds = new Set(variants.map((v) => v.variant!.kind));
    return { id, variant_group: med.variant_group, kind: kinds.size === 1 ? [...kinds][0] : 'colour_power', variants };
  }

  /** Strict per-locale public product DTO by canonical SKU (AI-commerce lookup). */
  async publicProductBySku(sku: string, locale = 'ar') {
    const n = Number(sku);
    if (!Number.isFinite(n)) throw new NotFoundException('product_not_found');
    const med: any = await this.conn.collection(CATALOG_COLLECTIONS.medicines).findOne(
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
    const term = normalizeSearchText(q || '');
    // A search is capped at 50. The plain catalogue listing (no term) pages up to 1000, like the 5000-URL sitemap
    // pages: /llms-full asks for 1000 per page and stopped after the first 50 products when this was 50 for both.
    const perPage = Math.min(Math.max(Number.isFinite(limit) ? limit : 20, 1), term ? 50 : 1000);
    const filter: any = { ...this.publicProductFilter() };
    if (term) {
      const terms = expandMultilingualSearchTerms(q || '').slice(0, 6);
      const orClauses: any[] = [];
      for (const t of terms) {
        const rx = { $regex: t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
        orClauses.push(
          { name_ar: rx },
          { name_en: rx },
          { active_ingredient: rx },
          { [`translations.${db}.name`]: rx },
          { [`translations.${db}.search_aliases`]: rx },
          { barcode: t },
        );
        if (db !== 'ur') orClauses.push({ 'translations.ur.search_aliases': rx });
        if (db !== 'hi') orClauses.push({ 'translations.hi.search_aliases': rx });
        if (Number.isFinite(Number(t))) {
          orClauses.push({ sku: Number(t) });
        }
      }
      filter.$or = orClauses;
    }
    const cursor = this.conn.collection(CATALOG_COLLECTIONS.medicines)
      .find(filter, { projection: { _id: 0, interactions: 0, change_requests: 0 } } as any)
      .sort({ usage_count: -1 })
      .skip((Math.max(page, 1) - 1) * perPage)
      .limit(perPage + 1);
    const fetched = await cursor.toArray();
    const hasMore = fetched.length > perPage;
    const rows = hasMore ? fetched.slice(0, perPage) : fetched;
    const total = term ? ((Math.max(page, 1) - 1) * perPage + rows.length + (hasMore ? 1 : 0)) : await this.publicListingCount(filter);
    return {
      query: term || null, locale, page: Math.max(page, 1), limit: perPage, total, has_more: hasMore,
      items: rows.map((m: any) => this.publicProductCard(m, locale)),
    };
  }

  /** One localized, buy-ready product card (the search results and the product page's equivalents share it). */
  private publicProductCard(m: any, locale: string) {
    // Issue 1555: one card builder, shared with GET /medicines/:id/alternatives (public-medicine.ts).
    return toPublicProductCard(m, locale);
  }

  /**
   * Issue 1547: what the product page shows under the product. `equivalents`: the published products with the same
   * NORMALIZED active ingredient set (product-equivalents.ts), same strength first. `similar`: only when there is no
   * equivalent, the published products of the same therapeutic class (sub_sub_category), then of the same
   * sub-category, then of the same category, most used first. Both empty when there is nothing to show.
   * Unknown or unpublished product: 404. Prices and the Rx rule come from the public DTO (no old price on Rx).
   */
  async publicProductEquivalents(locale: string, id: string, limit = 8) {
    const col = this.conn.collection(CATALOG_COLLECTIONS.medicines);
    const med: any = await col.findOne(
      { ...this.publicProductFilter(), id },
      { projection: { _id: 0, id: 1, active_ingredient: 1, strength: 1, form: 1, category: 1, sub_category: 1, sub_sub_category: 1 } },
    );
    if (!med) throw new NotFoundException('product_not_found');
    const max = Math.min(Math.max(Number.isFinite(limit) ? limit : 8, 1), 20);
    const fullProjection = { _id: 0, interactions: 0, change_requests: 0 };
    const cards = async (ids: string[]) => {
      if (!ids.length) return [];
      const rows: any[] = await col.find({ ...this.publicProductFilter(), id: { $in: ids } } as any, { projection: fullProjection } as any).toArray();
      const byId = new Map(rows.map((r) => [r.id, r]));
      return ids.map((x) => byId.get(x)).filter(Boolean).map((m) => this.publicProductCard(m, locale));
    };

    const parts = ingredientParts(med.active_ingredient);
    const pattern = ingredientCandidatePattern(parts);
    let equivalentIds: string[] = [];
    if (pattern) {
      const candidates: EquivalentRow[] = await col.find(
        { ...this.publicProductFilter(), ...NOT_PROMOTABLE_FILTER, id: { $ne: id }, active_ingredient: { $regex: pattern, $options: 'i' }, price: { $gt: 0 } } as any,
        { projection: { _id: 0, id: 1, active_ingredient: 1, strength: 1, form: 1, usage_count: 1, price: 1 } } as any,
      ).limit(500).toArray() as any;
      equivalentIds = rankEquivalents(med, candidates, max).map((r) => r.id);
    }
    const equivalents = await cards(equivalentIds);
    if (equivalents.length) return { locale, id, equivalents, similar: [] };

    // No equivalent: the same therapeutic class, widening to the sub-category and the category until the list is full.
    const scopes: Array<Record<string, string>> = [];
    if (med.category && med.sub_category && med.sub_sub_category) scopes.push({ category: med.category, sub_category: med.sub_category, sub_sub_category: med.sub_sub_category });
    if (med.category && med.sub_category) scopes.push({ category: med.category, sub_category: med.sub_category });
    if (med.category) scopes.push({ category: med.category });
    const similarIds: string[] = [];
    for (const scope of scopes) {
      if (similarIds.length >= max) break;
      const rows: any[] = await col.find(
        { ...this.publicProductFilter(), ...NOT_PROMOTABLE_FILTER, ...scope, id: { $nin: [id, ...similarIds] }, price: { $gt: 0 } } as any,
        { projection: { _id: 0, id: 1 } } as any,
      ).sort({ usage_count: -1, id: 1 }).limit(max - similarIds.length).toArray();
      similarIds.push(...rows.map((r) => r.id));
    }
    return { locale, id, equivalents: [], similar: await cards(similarIds) };
  }

  /** Slug batches for the web sitemap index (paginated XML sitemaps). */
  async publicProductSitemapPage(locale: string, page: number, perPage = 5000) {
    const key = `${locale}:${page}:${perPage}`;
    const hit = this.sitemapCache.get(key);
    if (hit && hit.exp > Date.now()) return hit.val;
    const db = productLocaleToDb(locale);
    // Every locale's slug: sitemap hreflang alternates must point at each locale's canonical URL
    // (slugs differ per locale; reusing one slug listed non-canonical URLs that Google ignores).
    const slugProjection: Record<string, 1> = {};
    for (const l of PUBLIC_CATALOG_LOCALES) slugProjection[`translations.${productLocaleToDb(l)}.slug`] = 1;
    const rows = await this.conn.collection(CATALOG_COLLECTIONS.medicines)
      .find(this.indexableProductFilter(), { projection: { _id: 0, slug: 1, updatedAt: 1, ...slugProjection } } as any)
      .sort({ id: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      // One round trip for the page (the driver default of 101 docs made ~50 getMore calls: Sentry NABD-BACKEND-1V).
      .batchSize(perPage)
      .toArray();
    const val = rows.map((m: any) => {
      const alternates: Record<string, string> = {};
      for (const l of PUBLIC_CATALOG_LOCALES) {
        const alt = m?.translations?.[productLocaleToDb(l)]?.slug || m.slug;
        if (alt) alternates[l] = alt;
      }
      return {
        slug: m?.translations?.[db]?.slug || m.slug,
        alternates,
        lastmod: m.updatedAt ? new Date(m.updatedAt).toISOString().slice(0, 10) : undefined,
      };
    }).filter((r: any) => r.slug);
    this.sitemapCache.set(key, { exp: Date.now() + SeoSearchService.SITEMAP_TTL_MS, val });
    // Bound memory: 6 locales × 5 pages max; evict expired entries on write.
    if (this.sitemapCache.size > 40) {
      const now = Date.now();
      for (const [k, v] of this.sitemapCache) if (v.exp <= now) this.sitemapCache.delete(k);
    }
    return val;
  }

  /** Image sitemap rows: a sitemap lists only indexable public products. */
  async imageSitemapMedicines(): Promise<any[]> {
    return this.conn.collection(CATALOG_COLLECTIONS.medicines)
      .find({ ...this.indexableProductFilter(), image: { $ne: null } }, { projection: { _id: 0, id: 1, name_ar: 1, slug: 1, image: 1 } } as any)
      .sort({ usage_count: -1 }).limit(1500).toArray();
  }

  async publicProductCount(): Promise<number> {
    return this.conn.collection(CATALOG_COLLECTIONS.medicines).countDocuments(this.indexableProductFilter());
  }

  /** DB-vs-sitemap reconciliation snapshot for admin (§52/§72). */
  async indexingStatus() {
    const [
      products, doctors, facilities, labs, radiology, nursing, locations, articles,
      doctorUrls, facilityUrls, locationUrls,
    ] = await Promise.all([
      this.publicProductCount().catch(() => 0),
      this.conn.collection('provider_profiles').countDocuments({ provider_type: 'doctor', is_active: { $ne: false } }).catch(() => 0),
      this.conn.collection('facilities').countDocuments({ is_active: { $ne: false } }).catch(() => 0),
      this.conn.collection(CATALOG_COLLECTIONS.lab_services).countDocuments({ active: { $ne: false } }).catch(() => 0),
      this.conn.collection(CATALOG_COLLECTIONS.radiology_services).countDocuments({ active: { $ne: false } }).catch(() => 0),
      this.conn.collection(CATALOG_COLLECTIONS.nursing_services).countDocuments({ is_active: { $ne: false } }).catch(() => 0),
      this.conn.collection('locations').countDocuments({ is_active: { $ne: false } }).catch(() => 0),
      this.conn.collection('articles').countDocuments({ status: 'PUBLISHED', is_deleted: { $ne: true } }).catch(() => 0),
      this.publicDoctorSitemap().catch(() => []),
      this.publicFacilitySitemap().catch(() => []),
      this.publicLocationSitemap().catch(() => []),
    ]);
    const check = (db: number, sm: number) => ({ db, sitemap_urls: sm, in_sync: db === 0 ? sm === 0 : sm > 0 });
    return {
      generated_at: new Date(),
      products: { db: products, note: 'paginated per-locale sitemaps' },
      doctors: check(doctors, (doctorUrls as any[]).length),
      facilities: check(facilities, (facilityUrls as any[]).length),
      labs: { db: labs },
      radiology: { db: radiology },
      nursing: { db: nursing },
      locations: check(locations, (locationUrls as any[]).length),
      articles: { db: articles },
    };
  }

  /** Doctor slugs for sitemaps: public, medically reviewed and index-eligible doctors only. */
  async publicDoctorSitemap() {
    const rows = await this.conn.collection('provider_profiles')
      .find(publicIndexableFilter('doctor'), { projection: { _id: 0, slug: 1, id: 1, updatedAt: 1 } })
      .limit(5000)
      .toArray();
    return rows.map((d: any) => ({
      slug: d.slug || d.id,
      lastmod: d.updatedAt ? new Date(d.updatedAt).toISOString().slice(0, 10) : undefined,
    }));
  }

  /** Facility slugs for sitemaps: public, reviewed and index-eligible facilities only. */
  async publicFacilitySitemap() {
    const rows = await this.conn.collection('facilities')
      .find(publicIndexableFilter('facility'), { projection: { _id: 0, slug: 1, id: 1, updatedAt: 1 } })
      .limit(5000)
      .toArray();
    return rows.map((f: any) => ({
      slug: f.slug || f.id,
      lastmod: f.updatedAt ? new Date(f.updatedAt).toISOString().slice(0, 10) : undefined,
    }));
  }

  /** Condition slugs for sitemaps. */
  async publicConditionSitemap() {
    const rows = await this.conn.collection('conditions')
      // the same rule the page applies (entity-graph: is_active), so the sitemap lists no 404s
      .find(publicIndexableFilter('condition'), { projection: { _id: 0, slug: 1, code: 1, id: 1, updatedAt: 1 } })
      .limit(5000)
      .toArray();
    // Q17: condition records carry `code` (headache, fever…), which is the public slug /condition/:slug resolves;
    // reading only slug/id emitted /condition/undefined for every condition in the sitemap.
    return rows
      .map((c: any) => ({ slug: c.code || c.slug || c.id, lastmod: c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0, 10) : undefined }))
      .filter((c: { slug?: string }) => typeof c.slug === 'string' && c.slug.length > 0);
  }

  /** (specialty, city) pairs that have public doctors, for /{locale}/doctors/{specialty}/{city}. */
  async publicDoctorCitySitemap() {
    const rows = await this.conn.collection('provider_profiles').aggregate([
      { $match: { ...publicIndexableFilter('doctor'), specialty: { $type: 'string', $ne: '' }, city: { $type: 'string', $ne: '' } } },
      { $group: { _id: { specialty: '$specialty', city: '$city' }, updatedAt: { $max: '$updatedAt' } } },
      { $limit: 5000 },
    ]).toArray();
    return rows.map((r: any) => ({
      specialty: r._id.specialty,
      city: r._id.city,
      lastmod: r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : undefined,
    }));
  }

  /** Pharmacy slugs for sitemaps (/{locale}/pharmacy/{slug}). */
  async publicPharmacySitemap() {
    const rows = await this.conn.collection('provider_profiles')
      .find(publicIndexableFilter('pharmacy'), { projection: { _id: 0, slug: 1, id: 1, updatedAt: 1 } })
      .limit(5000)
      .toArray();
    return rows.map((p: any) => ({ slug: p.slug || p.id, lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : undefined }));
  }

  /** Published article slugs for sitemaps (/{locale}/articles/{slug}). */
  async publicArticleSitemap() {
    const rows = await this.conn.collection('articles')
      .find(publicIndexableFilter('article'), { projection: { _id: 0, slug: 1, updatedAt: 1, published_at: 1 } })
      .limit(5000)
      .toArray();
    return rows
      .filter((a: any) => typeof a.slug === 'string' && a.slug)
      .map((a: any) => ({ slug: a.slug, lastmod: (a.updatedAt || a.published_at) ? new Date(a.updatedAt || a.published_at).toISOString().slice(0, 10) : undefined }));
  }

  /** Location paths for sitemaps. */
  async publicLocationSitemap() {
    const rows = await this.conn.collection('locations')
      .find({ is_active: { $ne: false }, type: { $in: ['city', 'district', 'region'] } }, { projection: { _id: 0, code: 1, name_en: 1, name_ar: 1, updatedAt: 1 } })
      .limit(5000)
      .toArray();
    return rows.map((l: any) => ({
      slug: slugify(l.name_en || l.name_ar || l.code),
      lastmod: l.updatedAt ? new Date(l.updatedAt).toISOString().slice(0, 10) : undefined,
    }));
  }

  /** Category cluster tree with live counts per locale. */
  async publicCategories(locale: string) {
    // The tree is a group over the whole public catalogue; counts change slowly, so it is kept 5 minutes and, once older, served stale
    // for up to an hour while ONE refresh runs behind the response (2026-10-27: no visitor waits for the group after the first one).
    const cacheKey = `cattree:${locale}`;
    const hit = this.sitemapCache.get(cacheKey);
    const now = Date.now();
    if (hit && hit.exp > now) return hit.val;
    if (hit && hit.stale > now) {
      if (!this.treeRefresh.has(cacheKey)) {
        const refresh = this.buildCategoryTree(locale).then((val) => this.sitemapCache.set(cacheKey, { exp: Date.now() + 5 * 60_000, stale: Date.now() + 60 * 60_000, val })).catch(() => undefined).finally(() => this.treeRefresh.delete(cacheKey));
        this.treeRefresh.set(cacheKey, refresh);
      }
      return hit.val;
    }
    const pending = this.treeRefresh.get(cacheKey);
    if (pending) { await pending; const again = this.sitemapCache.get(cacheKey); if (again) return again.val; }
    const val = await this.buildCategoryTree(locale);
    this.sitemapCache.set(cacheKey, { exp: Date.now() + 5 * 60_000, stale: Date.now() + 60 * 60_000, val });
    return val;
  }
  private readonly treeRefresh = new Map<string, Promise<unknown>>();

  private async buildCategoryTree(locale: string) {
    const db = productLocaleToDb(locale);
    const key = (f: string) => db === 'ar' ? f : `translations.${db}.${f === 'category' ? 'main_category' : f}`;
    const rows = await this.conn.collection(CATALOG_COLLECTIONS.medicines).aggregate([
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

  /** Equality clauses for a category name that matches exactly one tree entry in both the locale and Arabic trees, else null. */
  private async exactCategoryClauses(locale: string, name: string, escaped: string, field: string) {
    const rx = new RegExp(escaped, 'i');
    const only = (tree: { categories: { name: string }[] }) => {
      const hits = tree.categories.filter((c) => rx.test(c.name));
      return hits.length === 1 && hits[0].name === name;
    };
    try {
      if (!only(await this.publicCategories(locale))) return null;
      if (field === 'category') return [{ category: name }];
      if (!only(await this.publicCategories('ar'))) return null;
      return [{ [field]: name }, { category: name }];
    } catch {
      return null;
    }
  }

  /** Paginated products inside a localized category cluster. */
  async publicCategoryProducts(locale: string, category: string, sub?: string, page = 1, limit = 24, q?: string, sort: CatalogueSort = 'popular', extra: CatalogueFilterInput = {}) {
    const db = productLocaleToDb(locale);
    const key = (f: string) => db === 'ar' ? f : `translations.${db}.${f === 'category' ? 'main_category' : f}`;
    const filter: any = { ...this.publicProductFilter() };

    const CANONICAL_CATEGORY_MAP: Record<string, string> = {
      'all': 'all',
      'الكل': 'all',
      'medications': 'الأدوية والعلاج',
      'medicines': 'الأدوية والعلاج',
      'أدوية': 'الأدوية والعلاج',
      'ادوية': 'الأدوية والعلاج',
      'أدوية وعلاجات': 'الأدوية والعلاج',
      'ادوية وعلاجات': 'الأدوية والعلاج',
      'الأدوية والعلاج': 'الأدوية والعلاج',
      'الادوية والعلاج': 'الأدوية والعلاج',
      'hair-care': 'العناية بالشعر',
      'عناية بالشعر': 'العناية بالشعر',
      'العناية بالشعر': 'العناية بالشعر',
      'cosmetics': 'المكياج والإكسسوارات',
      'makeup': 'المكياج والإكسسوارات',
      'مكياج وإكسسوارات': 'المكياج والإكسسوارات',
      'مكياج واكسسوارات': 'المكياج والإكسسوارات',
      'المكياج والإكسسوارات': 'المكياج والإكسسوارات',
      'المكياج والاكسسوارات': 'المكياج والإكسسوارات',
      'skincare': 'العناية بالبشرة',
      'skin-care': 'العناية بالبشرة',
      'عناية بالبشرة': 'العناية بالبشرة',
      'العناية بالبشرة': 'العناية بالبشرة',
      'baby': 'الأم والطفل',
      'baby-care': 'الأم والطفل',
      'الأم والطفل': 'الأم والطفل',
      'الام والطفل': 'الأم والطفل',
      'ام وطفل': 'الأم والطفل',
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

    // Control characters (a NUL makes MongoDB reject the regex) never belong in a category name.
    const decodedCat = category ? safeDecode(category).replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim() || 'all' : 'all';
    const resolvedCat = CANONICAL_CATEGORY_MAP[decodedCat.toLowerCase()] || CANONICAL_CATEGORY_MAP[decodedCat] || decodedCat;

    if (resolvedCat && resolvedCat !== 'all' && resolvedCat !== 'الكل') {
      const cleanTerm = resolvedCat.replace(/^ال/, '').replace(/[\u064B-\u065F\u0670\u0640]/g, '').trim();
      const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Fast path: when the name is a real category and no other category name contains the term, the regex
      // branches add nothing, and plain equality lets the category-led covering index answer the query.
      const exact = await this.exactCategoryClauses(locale, resolvedCat, escaped, key('category'));
      filter.$or = exact ?? [
        { [key('category')]: resolvedCat },
        { [key('category')]: { $regex: escaped, $options: 'i' } },
        { category: resolvedCat },
        { category: { $regex: escaped, $options: 'i' } },
      ];
      if (sub) {
        const decodedSub = safeDecode(sub).replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
        const subEscaped = decodedSub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter[key('sub_category')] = { $regex: subEscaped, $options: 'i' };
      }
    }

    if (q && q.trim()) {
      const terms = expandMultilingualSearchTerms(q.trim()).slice(0, 6);
      const qOrClauses: any[] = [];
      for (const t of terms) {
        const trx = { $regex: t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
        qOrClauses.push(
          { name_ar: trx },
          { name_en: trx },
          { active_ingredient: trx },
          { barcode: t },
          { [`translations.${db}.name`]: trx },
          { [`translations.${db}.search_aliases`]: trx },
        );
      }
      // A query that normalises to nothing (control characters only) adds no filter: Mongo refuses an empty $or.
      if (qOrClauses.length && filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: qOrClauses }];
        delete filter.$or;
      } else if (qOrClauses.length) {
        filter.$or = qOrClauses;
      }
    }

    // Design parity (#1819): form / brand / rx / price range, validated in catalogue-filters.ts.
    const extras = catalogueFilterClauses(extra, db);
    if (extras.and.length) filter.$and = [...(filter.$and || []), ...extras.and];

    const perPage = Math.min(Math.max(limit, 1), 48);
    // Popularity-first ordering (views → rating → stable id). Deliberately NOT
    // image-first: imageless medicines were buried under cosmetics on "All".
    // #816: the patient may order by price or newest; the default stays popularity (views, rating, stable id).
    const sortClause: any = sort === 'price_asc' ? { price: 1, _id: 1 }
      : sort === 'price_desc' ? { price: -1, _id: 1 }
      : sort === 'newest' ? { createdAt: -1, _id: 1 }
      : sort === 'most_ordered' ? { orders_count: -1, _id: 1 }
      : { usage_count: -1, rating: -1, _id: 1 };
    // An explicit price order skips items without a real price (a 0 is "no price", never the cheapest).
    if (sort === 'price_asc' || sort === 'price_desc') filter.price = { $gt: 0 };
    if (extras.price) filter.price = { ...(filter.price || {}), ...extras.price, ...(extras.price.$gte === undefined && extras.price.$lte !== undefined ? { $gt: 0 } : {}) };

    const projection = { _id: 0, id: 1, sku: 1, slug: 1, name_ar: 1, name_en: 1, price: 1, old_price: 1, image_1: 1, image: 1, images: 1, form: 1, strength: 1, package_size: 1, category: 1, sub_category: 1, active_ingredient: 1, requires_prescription: 1, online_exclusive: 1, availability_status: 1, usage_count: 1, translations: 1 };
    const skip = (Math.max(page, 1) - 1) * perPage;
    const medicines = this.conn.collection(CATALOG_COLLECTIONS.medicines);
    // The default order is the ranking's composite score (in stock and with an image first among equals), not the old usage counter.
    const [rows, total] = await Promise.all([
      sort === 'popular'
        ? popularPage(medicines as any, filter, skip, perPage, projection, decodedCat === 'all' && !q)
        : medicines.find(filter, { projection } as any).sort(sortClause).skip(skip).limit(perPage).toArray(),
      this.publicListingCount(filter),
    ]);
    const items = rows.map((m: any) => {
      const dto = resolveMedicinePublicDto(m, locale);
      return {
        sku: dto.sku, id: dto.id, slug: dto.slug, name: dto.name, form: dto.form, strength: dto.strength,
        package_size: dto.package_size, price: dto.price, old_price: dto.old_price, currency: dto.currency,
        is_rx: dto.is_rx, online_exclusive: dto.online_exclusive, available: dto.available, image: dto.image,
        // a card with more than one picture turns through them (at most five, the first is `image`)
        ...(Array.isArray(dto.images) && dto.images.length > 1 ? { images: dto.images.slice(0, 5) } : {}),
      };
    });
    // No page-1 pins and no round-robin fill any more: the aggregate above already orders the whole list by the composite
    // score (see POPULAR_ORDER_STAGES), so a product nobody viewed, searched, carted or ordered can no longer jump ahead of one that was.
    return {
      locale, category: decodedCat, sub_category: sub ? safeDecode(sub) : null,
      page: Math.max(page, 1), limit: perPage, total,
      items,
    };
  }

  async globalSearch(q: string, limit = 5): Promise<any> {
    q = normalizeSearchText(q || '');
    const term = (q || '').trim();
    if (term.length < 2) return { query: q, results: {}, total: 0 };
    const rx = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const medProj = { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, image: 1, category: 1, manufacturer: 1 };
    const docProj = { _id: 0, id: 1, name: 1, full_name: 1, specialty: 1, photo_url: 1, rating: 1, city: 1 };
    const terms = expandMultilingualSearchTerms(q || '');
    const medOrClauses: any[] = [];
    for (const t of terms) {
      const trx = { $regex: t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      medOrClauses.push(
        { name_ar: trx },
        { name_en: trx },
        { active_ingredient: trx },
        { search_text: trx },
        { 'translations.ur.name': trx },
        { 'translations.ur.search_aliases': trx },
        { 'translations.hi.name': trx },
        { 'translations.hi.search_aliases': trx },
        { 'translations.bn.name': trx },
        { 'translations.bn.search_aliases': trx },
        { 'translations.tl.name': trx },
        { 'translations.tl.search_aliases': trx },
      );
    }
    const medQuery = { ...this.publicProductFilter(), $or: medOrClauses };
    const [medicines, doctors, pharmacies, hospitals, labs, services] = await Promise.all([
      this.conn.collection(CATALOG_COLLECTIONS.medicines).find(medQuery as any, { projection: medProj } as any).limit(limit).toArray(),
      this.conn.collection('provider_profiles').find({ provider_type: 'doctor', $or: [{ name: rx }, { full_name: rx }, { specialty: rx }] } as any, { projection: docProj } as any).limit(limit).toArray(),
      this.conn.collection('provider_profiles').find({ provider_type: 'pharmacy', $or: [{ name: rx }, { facility_name: rx }] } as any, { projection: { _id: 0, id: 1, name: 1, facility_name: 1, city: 1, logo_url: 1 } } as any).limit(limit).toArray(),
      this.conn.collection('provider_profiles').find({ provider_type: { $in: ['hospital', 'clinic', 'medical_center'] }, $or: [{ name: rx }, { facility_name: rx }] } as any, { projection: { _id: 0, id: 1, name: 1, facility_name: 1, city: 1 } } as any).limit(limit).toArray(),
      this.conn.collection('provider_profiles').find({ provider_type: { $in: ['lab', 'laboratory'] }, $or: [{ name: rx }, { facility_name: rx }] } as any, { projection: { _id: 0, id: 1, name: 1, facility_name: 1, city: 1 } } as any).limit(limit).toArray(),
      this.conn.collection(CATALOG_COLLECTIONS.nursing_services).find({ $or: [{ name_ar: rx }, { name_en: rx }] } as any, { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1 } } as any).limit(limit).toArray().catch(() => []),
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
    // P13-R8: internal links only from real, governed edges — the root and
    // every candidate must pass the same public rule as the entity pages.
    const med: any = await this.conn.collection(CATALOG_COLLECTIONS.medicines).findOne({ id, ...PUBLIC_MEDICINE }, { projection: { _id: 0 } });
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
      queries.push(this.conn.collection(CATALOG_COLLECTIONS.medicines).find({ active_ingredient: med.active_ingredient, ...PUBLIC_MEDICINE, ...NOT_PROMOTABLE_FILTER } as any, { projection: card } as any).limit(20).toArray()
        .then(rows => rows.forEach(r => add(r, 50, 'نفس المادة الفعالة'))));
    }
    // 2) Same strength/dosage (within ingredient match)
    if (med.active_ingredient && med.strength) {
      queries.push(this.conn.collection(CATALOG_COLLECTIONS.medicines).find({ active_ingredient: med.active_ingredient, strength: med.strength, ...PUBLIC_MEDICINE, ...NOT_PROMOTABLE_FILTER } as any, { projection: card } as any).limit(10).toArray()
        .then(rows => rows.forEach(r => add(r, 15, 'نفس التركيز'))));
    }
    // 3) Same category + sub_category (usage similarity)
    queries.push(this.conn.collection(CATALOG_COLLECTIONS.medicines).find({ category: med.category, sub_category: med.sub_category, ...PUBLIC_MEDICINE, ...NOT_PROMOTABLE_FILTER } as any, { projection: card } as any).limit(20).toArray()
      .then(rows => rows.forEach(r => add(r, med.active_ingredient ? 10 : 30, 'نفس الفئة والاستخدام'))));
    // 4) Same brand/manufacturer
    const brand = med.brand || med.manufacturer;
    if (brand) {
      queries.push(this.conn.collection(CATALOG_COLLECTIONS.medicines).find({ $or: [{ brand }, { manufacturer: brand }], ...PUBLIC_MEDICINE, ...NOT_PROMOTABLE_FILTER } as any, { projection: card } as any).limit(15).toArray()
        .then(rows => rows.forEach(r => add(r, 8, 'نفس البراند'))));
    }
    // 5) Popularity boost (usage_count percentile)
    queries.push(this.conn.collection(CATALOG_COLLECTIONS.medicines).find({ category: med.category, ...PUBLIC_MEDICINE, ...NOT_PROMOTABLE_FILTER } as any, { projection: card } as any).sort({ usage_count: -1 }).limit(10).toArray()
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
    // P13-R8: internal links only from real, governed edges — same public
    // rule as the doctor pages (suspended or unreviewed doctors link nowhere).
    const doc: any = await this.conn.collection('provider_profiles').findOne({ id, provider_type: 'doctor', ...PUBLIC_TYPED_PROVIDER } as any, { projection: { _id: 0 } });
    if (!doc) return { same_specialty: [], nearby: [] };
    const card = { _id: 0, id: 1, name: 1, full_name: 1, specialty: 1, photo_url: 1, rating: 1, city: 1, consultation_price: 1 };
    const [sameSpecialty, nearby] = await Promise.all([
      doc.specialty
        ? this.conn.collection('provider_profiles').find({ provider_type: 'doctor', specialty: doc.specialty, id: { $ne: id }, ...PUBLIC_TYPED_PROVIDER } as any, { projection: card } as any).sort({ rating: -1 }).limit(limit).toArray()
        : Promise.resolve([]),
      doc.city
        ? this.conn.collection('provider_profiles').find({ provider_type: 'doctor', city: doc.city, id: { $ne: id }, ...PUBLIC_TYPED_PROVIDER } as any, { projection: card } as any).sort({ rating: -1 }).limit(limit).toArray()
        : Promise.resolve([]),
    ]);
    return { same_specialty: sameSpecialty, nearby, ranking: 'specialty>nearby>rating (AI-rank ready)' };
  }
}

@Controller()
export class SeoSearchController {
  constructor(private readonly svc: SeoSearchService) {}


  @Public()
  @PublicCache(3600, ['seo', 'sitemap'])
  /** The public sitemap is the patient web's (six locales, hreflang, paginated catalogue). */
  @Get('sitemap.xml')
  sitemap(@Res() res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.redirect(301, `${siteOrigin()}/sitemap.xml`);
  }

  @Public()
  @Get('robots.txt')
  robots(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *\nAllow: /sitemap.xml\nDisallow: /api/\nSitemap: ${siteOrigin()}/sitemap.xml\n`);
  }

  /** Site-wide structured data (Organization + LocalBusiness + FAQ) for the future site shell. */
  @Public()
  @Get('seo/site/organization')
  organization(): any {
    return {
      '@context': 'https://schema.org', '@type': 'Organization', name: 'نبض', url: SITE,
      logo: `${SITE}/logo.png`,
      sameAs: [SITE, `${SITE}/llms.txt`],
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
    // P13-R16: collection-driven via the service; the previous hardcoded copy
    // stays the fallback inside siteFaqJsonLd, so this route never 500s.
    return this.svc.siteFaqJsonLd();
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

  /** AI-search readiness: llms.txt guidance for LLM crawlers. F23: live product count. */
  @Public()
  @Get('llms.txt')
  async llmsTxt(@Res() res: Response) {
    const n = await this.svc.catalogCount().catch(() => 0);
    const countTxt = n > 0 ? ` (${n.toLocaleString('en-US')} منتجاً)` : '';
    res.setHeader('Content-Type', 'text/plain');
    res.send(`# نبض — منصة رعاية صحية رقمية\n\n` +
      `> صيدلية إلكترونية${countTxt} + استشارات + تحاليل + أشعة + تمريض منزلي في السعودية.\n\n` +
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
    const meds = await this.svc.imageSitemapMedicines();
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
  async medicineRecommendations(@Param('id') id: string, @Query('limit') limit?: string) {
    // Issue 1555: public fields only (no popularity counter, no old price on a prescription item).
    return toPublicMedicine(await this.svc.medicineRecommendations(id, parseInt(limit || '12')));
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

  /** Issue 1547: the product page's equivalents (same normalized active ingredient), or similar products when none. */
  @Public()
  @Get('public/product-equivalents/:locale/:id')
  publicProductEquivalents(@Param('locale') locale: string, @Param('id') id: string, @Query('limit') limit?: string) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    return this.svc.publicProductEquivalents(locale, id, Number.parseInt(limit ?? '', 10) || 8);
  }

  /** Legacy id-based lookup (redirects legacy /medicines/:id pages to /p/{slug}). */
  @Public()
  @Get('public/product-by-id/:locale/:id')
  publicProductById(@Param('locale') locale: string, @Param('id') id: string) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    return this.svc.publicProductById(locale, id);
  }

  /** Decision D (issue 1556): the variants (powers, colours, shades) of a published product, for the picker. */
  @Public()
  @Get('public/product-variants/:locale/:id')
  publicProductVariants(@Param('locale') locale: string, @Param('id') id: string) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    return this.svc.publicProductVariants(locale, String(id || '').slice(0, 120));
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
  @UseInterceptors(RedisCacheInterceptor)
  @PublicCache(300, ['medicines', 'public-catalogue'], { cacheControl: 'public, s-maxage=300, stale-while-revalidate=600' })
  @Throttle({ default: { limit: 1200, ttl: 60_000 } })
  @Get('public/categories/:locale')
  publicCategories(@Param('locale') locale: string) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    return this.svc.publicCategories(locale);
  }

  /** Category cluster products. */
  @Public()
  @UseInterceptors(RedisCacheInterceptor)
  @PublicCache(300, ['medicines', 'public-catalogue'], { cacheControl: 'public, s-maxage=300, stale-while-revalidate=600' })
  @Throttle({ default: { limit: 1200, ttl: 60_000 } })
  @Get('public/categories/:locale/items')
  publicCategoryProducts(
    @Param('locale') locale: string,
    @Query('category') category?: string,
    @Query('sub') sub?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('form') form?: string,
    @Query('brand') brand?: string,
    @Query('rx') rx?: string,
    @Query('price_min') priceMin?: string,
    @Query('price_max') priceMax?: string,
  ) {
    if (!(PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) throw new NotFoundException('locale_not_supported');
    const cat = category || 'all';
    const order: CatalogueSort = (CATALOGUE_SORTS as readonly string[]).includes(sort || '') ? sort as CatalogueSort : 'popular';
    // parseInt('garbage') is NaN, and NaN reaches Mongo as skip/limit and
    // comes back as a 500. Anything unparseable falls back to the default.
    const bounded = (raw: string | undefined, fallback: number, max: number) => {
      const n = Number.parseInt(raw ?? '', 10);
      return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
    };
    return this.svc.publicCategoryProducts(locale, cat, sub, bounded(page, 1, 10_000), bounded(limit, 24, 100), q, order, { form, brand, rx, price_min: priceMin, price_max: priceMax });
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

  /** Lightweight page-count for the sitemap index (countDocuments only — no 5MB bodies). */
  @Public()
  @Get('public/sitemaps/products-count')
  async publicProductSitemapCount() {
    const total = await this.svc.publicProductCount().catch(() => 0);
    return { total, per_page: 5000, pages: Math.max(Math.ceil(total / 5000), 1) };
  }

  @Public()
  @Get('public/sitemaps/doctors/:locale')
  async publicDoctorSitemap(@Param('locale') locale: string) {
    const urls = await this.svc.publicDoctorSitemap();
    return { locale, total: urls.length, urls };
  }

  @Public()
  @Get('public/sitemaps/facilities/:locale')
  async publicFacilitySitemap(@Param('locale') locale: string) {
    const urls = await this.svc.publicFacilitySitemap();
    return { locale, total: urls.length, urls };
  }

  @Public()
  @Get('public/sitemaps/conditions/:locale')
  async publicConditionSitemap(@Param('locale') locale: string) {
    const urls = await this.svc.publicConditionSitemap();
    return { locale, total: urls.length, urls };
  }

  @Public()
  @Get('public/sitemaps/doctor-cities/:locale')
  async publicDoctorCitySitemap(@Param('locale') locale: string) {
    const urls = await this.svc.publicDoctorCitySitemap();
    return { locale, total: urls.length, urls };
  }

  @Public()
  @Get('public/sitemaps/pharmacies/:locale')
  async publicPharmacySitemap(@Param('locale') locale: string) {
    const urls = await this.svc.publicPharmacySitemap();
    return { locale, total: urls.length, urls };
  }

  @Public()
  @Get('public/sitemaps/articles/:locale')
  async publicArticleSitemap(@Param('locale') locale: string) {
    const urls = await this.svc.publicArticleSitemap();
    return { locale, total: urls.length, urls };
  }

  @Public()
  @Get('public/sitemaps/locations/:locale')
  async publicLocationSitemap(@Param('locale') locale: string) {
    const urls = await this.svc.publicLocationSitemap();
    return { locale, total: urls.length, urls };
  }
}

@Controller('admin/seo')
@Roles(UserRole.ADMIN)
export class SeoAdminController {
  constructor(
    private readonly svc: SeoSearchService,
    @Optional() private readonly pipeline?: AutoEntitySeoPipelineService,
  ) {}

  /**
   * Indexing/db reconciliation status for the admin dashboard (§52/§72):
   * live DB counts per entity vs sitemap URL counts, so stale downstream
   * state is detectable without manual queries.
   */
  @Get('status')
  async status() {
    return this.svc.indexingStatus();
  }

  /**
   * Medicine SEO report (owner 2026-10-12): approved for publication, and translation gaps per
   * public locale among them. Counts only; nothing is filled in.
   */
  @Get('medicine-report')
  async medicineReport(@Query('format') format?: string) {
    const report = await buildMedicineReport(this.svc.connection());
    return format === 'markdown' ? { markdown: medicineReportMarkdown(report) } : report;
  }

  /**
   * R16: backfill canonical slugs for public entities missing them
   * (live sitemap showed raw UUIDs). Bounded batches; each entity goes
   * through the governed pipeline (collision check + history).
   */
  @RequirePermissions(Permission.SEO_CONTROL)
  @Post('backfill-slugs')
  async backfillSlugs(@Body() dto: BackfillSlugsDto) {
    if (!this.pipeline) return { ok: false, error: 'pipeline_unavailable' };
    const allowed: PipelineEntityType[] = ['doctor', 'pharmacy', 'hospital', 'clinic', 'lab', 'radiology', 'nursing'];
    const type = (dto?.type || 'doctor') as PipelineEntityType;
    if (!allowed.includes(type)) return { ok: false, error: 'unsupported_type' };
    const limit = Math.min(Math.max(Number(dto?.limit) || 100, 1), 500);
    const out = await (this.pipeline as any).backfillMissingSlugs(type, limit);
    return { ok: true, type, ...out };
  }

  /**
   * R49 warmup: prime Redis + edge cache for the hottest public URLs
   * after each deploy (sitemap, catalogs, MCP). Call once post-deploy.
   */
  @RequirePermissions(Permission.SEO_CONTROL)
  @Post('warm-cache')
  async warmCache() {
    const base = (process.env.NABD_PUBLIC_URL || 'https://api.nabd.plus').replace(/\/$/, '');
    const paths = [
      '/api/v1/seo/sitemap.xml',
      '/api/v1/catalogs/insurance',
      '/api/v1/catalogs/labs',
      '/api/v1/catalogs/radiology',
      '/api/v1/catalogs/nursing',
      '/api/v1/mcp/tools',
      '/api/v1/mcp/server-card',
    ];
    const out: Array<{ path: string; status: number; ms: number }> = [];
    for (const p of paths) {
      const t0 = Date.now();
      try {
        const r = await timedFetch(base + p, { headers: { 'User-Agent': 'NabdPlus-CacheWarmer/1.0' } }, { timeoutMs: 5000, label: 'cache-warmer' }); // best effort: a slow page is recorded as status 0
        out.push({ path: p, status: r.status, ms: Date.now() - t0 });
        await r.arrayBuffer().catch(() => null);
      } catch {
        out.push({ path: p, status: 0, ms: Date.now() - t0 });
      }
    }
    return { ok: true, warmed: out };
  }
}

@Module({
  imports: [
    // P5.3: merged from SeoModule (seo/ → seo-search/)
    MongooseModule.forFeature([
      { name: 'Medicine', schema: MedicineSchema },
      { name: 'LabService', schema: LabServiceSchema },
      { name: 'HomeCareService', schema: HomeCareServiceSchema },
      { name: 'Facility', schema: FacilitySchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
      { name: 'Article', schema: ArticleSchema },
    ]),
  ],
  controllers: [SeoSearchController, SeoAdminController, SeoController],
  providers: [
    SeoSearchService,
    // P5.3: merged from SeoModule (seo/ → seo-search/)
    SeoService,
    IndexNowService,
    SeoIndexingListener,
    SeoIndexingService,
    RedisCacheInterceptor,
    { provide: 'FacilityRepository', useClass: FacilityRepository },
    { provide: 'ArticleRepository', useClass: ArticleRepository },
    { provide: 'HomeCareServiceRepository', useClass: HomeCareServiceRepository },
    { provide: 'LabServiceRepository', useClass: LabServiceRepository },
    { provide: 'MedicineRepository', useClass: MedicineRepository },
    { provide: 'ProviderProfileRepository', useClass: ProviderProfileRepository },
  ],
  exports: [SeoService, IndexNowService, SeoIndexingService],
})
export class SeoSearchModule {}
