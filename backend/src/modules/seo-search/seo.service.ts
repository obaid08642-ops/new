import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { controlsMap, isTypeIndexable, robotsDisallowLines } from './seo-controls.util';
import { PublicEntityType, SITE_LOCALES, localizedPaths, publicCitySlugs, siteOrigin } from './seo-public-urls';
import { buildSlug, parseSlugSuffix, slugify, escapeRegex } from '../../common/slug.util';
import { MedicineRepository } from "./seo-repositories/medicine.repository";
import { LabServiceRepository } from "./seo-repositories/labservice.repository";
import { HomeCareServiceRepository } from "./seo-repositories/homecareservice.repository";
import { FacilityRepository } from "./seo-repositories/facility.repository";
import { ProviderProfileRepository } from "./seo-repositories/providerprofile.repository";

export type EntityType = 'medicine' | 'doctor' | 'lab-service' | 'home-care-service' | 'facility' | 'article';

const PUBLIC_BASE = process.env.NABD_PUBLIC_URL || 'https://nabd.plus';

@Injectable()
export class SeoService {
  constructor(
    @Inject('MedicineRepository') private medM: MedicineRepository,
    @Inject('LabServiceRepository') private labSvcM: LabServiceRepository,
    @Inject('HomeCareServiceRepository') private hcSvcM: HomeCareServiceRepository,
    @Inject('FacilityRepository') private facilityM: FacilityRepository,
    @Inject('ProviderProfileRepository') private providerM: ProviderProfileRepository,
    @Inject('ArticleRepository') private articleM: any,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  // ── SEO publishing controls (admin-managed, cached 30s, fail-open) ──
  private controlsCache: { map: Map<string, boolean>; exp: number } | null = null;

  private async loadControls(): Promise<Map<string, boolean>> {
    const now = Date.now();
    if (this.controlsCache && this.controlsCache.exp > now) return this.controlsCache.map;
    let rows: any[] = [];
    try {
      rows = await this.conn.collection('seo_controls').find({}).toArray();
    } catch {
      rows = []; // fail-open: no collection ⇒ everything stays indexable
    }
    const map = controlsMap(rows);
    this.controlsCache = { map, exp: now + 30_000 };
    return map;
  }

  /** Invalidate after POST /admin/ops/seo/controls so changes apply instantly. */
  invalidateControlsCache() {
    this.controlsCache = null;
  }

  private modelFor(type: string): any {
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

  /**
   * Single fail-closed boundary for every public discovery read. Operational
   * status alone never authorizes public visibility, crawling, AI summaries,
   * share links, or IndexNow notifications. Articles retain their editorial
   * publication state until an equivalent medical-review workflow is added.
   */
  private publicQuery(type: string, indexed = false): any {
    if (type === 'article') return { status: 'PUBLISHED', is_deleted: { $ne: true } };
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

  /** Look up an entity by a slug like "panadol-extra-a1b2c3". */
  async resolve(type: string, slug: string) {
    const model = this.modelFor(type);
    if (!model) return null;

    // Exact lookup only inside the reviewed, publicly eligible entity set.
    const exact = await model.findOne({ ...this.publicQuery(type), slug }, { _id: 0, __v: 0 }).lean();
    if (exact) return exact;

    // R69: renamed slugs resolve via history (caller issues the 301).
    try {
      const hist: any = await this.conn.collection('slug_history').findOne({ entity_type: type, old_slug: slug });
      if (hist?.new_slug) {
        const moved: any = await model.findOne({ ...this.publicQuery(type), slug: hist.new_slug }, { _id: 0, __v: 0 }).lean();
        if (moved) return { ...moved, _moved_from: slug };
      }
    } catch { /* history is best-effort */ }

    const sfx = parseSlugSuffix(slug);
    if (!sfx) {
      // No id suffix — try fuzzy by name (input escaped: NABD-BACKEND-1/2 class).
      const re = new RegExp(escapeRegex(slug.replace(/-/g, ' ')), 'i');
      return model.findOne(
        { ...this.publicQuery(type), $or: [{ name_en: re }, { name_ar: re }, { full_name: re }] },
        { _id: 0, __v: 0 },
      ).lean();
    }
    // Match the id-prefix (first 6 hex chars after stripping dashes).
    // sfx is hex-constrained by parseSlugSuffix and escaped: no regex metachars survive.
    if (!/^[0-9a-f]{1,64}$/i.test(sfx)) return null;
    const reId = new RegExp(`^${escapeRegex(sfx)}`, 'i');
    return model.findOne({ ...this.publicQuery(type), id: { $regex: reId } } as any, { _id: 0, __v: 0 }).lean();
  }

  /** Build meta tags for an entity slug. */
  async meta(type: string, slug: string) {
    const entity: any = await this.resolve(type, slug);
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
      slug: buildSlug(name, entity.id),
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

  /** Build a public share link for an entity. */
  async buildShareLink(type: string, id: string) {
    const model = this.modelFor(type);
    if (!model) return { ok: false, reason: 'unknown_type' };
    const entity: any = await model.findOne({ ...this.publicQuery(type), id }, { _id: 0 }).lean();
    if (!entity) return { ok: false, reason: 'not_found' };
    const name = entity.name_ar || entity.name_en || entity.full_name || 'item';
    return {
      ok: true,
      url: this.buildShareUrl(type, name, id),
      slug: buildSlug(name, id),
      deep_link: `nabdplus://s/${type}/${buildSlug(name, id)}`,
    };
  }

  private buildShareUrl(type: string, name: string, id: string): string {
    return `${PUBLIC_BASE}/s/${type}/${buildSlug(name, id)}`;
  }

  private composeDescription(type: string, e: any): string {
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

  /** Basic Schema.org structured data for SEO crawlers. */
  private structuredData(type: string, e: any, url: string) {
    const name = e.name_ar || e.name_en || e.full_name || e.title_ar || e.title_en;
    const base: any = { '@context': 'https://schema.org', name, url };
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

  // ====================================================================
  // SITEMAP — auto-generated XML listing every public entity.
  async sitemap(): Promise<string> {
    const now = new Date().toISOString();
    const urls: string[] = [];
    const seenUrls = new Set<string>();
    const origin = siteOrigin();
    // Sitemap protocol limit per file. The patient web's paginated sitemaps carry the full catalogue.
    const MAX_URLS = 50_000;
    const xmlEsc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const addUrl = (loc: string, lastmod: string, changefreq = 'weekly', priority = 0.7, alternates = '') => {
      const cleanLoc = loc.trim();
      if (!cleanLoc || seenUrls.has(cleanLoc) || urls.length >= MAX_URLS) return;
      seenUrls.add(cleanLoc);
      urls.push(`<url><loc>${xmlEsc(cleanLoc)}</loc>${alternates}<lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`);
    };

    // Locale homes
    for (const l of SITE_LOCALES) addUrl(`${origin}/${l}`, now, 'daily', 1.0);

    // One entry per locale page, each with the six hreflang alternates and x-default (Arabic).
    const pushEntities = async (
      type: PublicEntityType,
      model: any,
      query: any,
      priority = 0.7,
      changefreq = 'weekly',
      cities: string[] = [],
    ) => {
      try {
        const docs = await model
          .find(query, { id: 1, slug: 1, code: 1, short_code: 1, translations: 1, name_ar: 1, name_en: 1, full_name: 1, title_ar: 1, title_en: 1, updatedAt: 1 })
          .lean()
          .limit(5000); // safety cap per type
        for (const d of docs as any[]) {
          const lastmod = d.updatedAt ? new Date(d.updatedAt).toISOString() : now;
          const perLocale = SITE_LOCALES.map((l) => localizedPaths(type, d, l, cities));
          const variants = perLocale[0]?.length ?? 0;
          for (let i = 0; i < variants; i++) {
            const links = SITE_LOCALES.map((l, li) => perLocale[li][i] ? `<xhtml:link rel="alternate" hreflang="${l}" href="${xmlEsc(origin + perLocale[li][i])}"/>` : '').join('')
              + (perLocale[0][i] ? `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEsc(origin + perLocale[0][i])}"/>` : '');
            SITE_LOCALES.forEach((_, li) => { if (perLocale[li][i]) addUrl(origin + perLocale[li][i], lastmod, changefreq, priority, links); });
          }
        }
      } catch { /* best effort */ }
    };

    // Only explicitly index-eligible public entities may enter crawler outputs.
    // Admin seo_controls can additionally block a whole entity type.
    const controls = await this.loadControls();
    if (isTypeIndexable('doctor', controls)) await pushEntities('doctor', this.providerM, this.publicQuery('doctor', true), 0.85, 'weekly');
    if (isTypeIndexable('facility', controls)) await pushEntities('facility', this.facilityM, this.publicQuery('facility', true), 0.6, 'monthly');
    if (isTypeIndexable('article', controls)) await pushEntities('article', this.articleM, this.publicQuery('article', true), 0.6, 'weekly');
    if (isTypeIndexable('home-care-service', controls)) await pushEntities('home_care_service', this.hcSvcM, this.publicQuery('home-care-service', true), 0.7);
    if (isTypeIndexable('lab-service', controls)) await pushEntities('lab_service', this.labSvcM, this.publicQuery('lab-service', true), 0.7, 'weekly', (await publicCitySlugs(this.conn)).slice(0, 6));
    if (isTypeIndexable('medicine', controls)) await pushEntities('medicine', this.medM, this.publicQuery('medicine', true), 0.8);

    // Dynamically include all materialized projections from the AutoEntitySeoPipeline
    try {
      const projections = await this.conn.collection('public_catalog_projections')
        .find({ indexable: true, 'sitemap.included': true })
        .limit(5000)
        .toArray();

      for (const p of projections) {
        if (!p.canonical_url) continue; // a projection without a web URL has no page to list
        const lastmod = p.updated_at ? new Date(p.updated_at).toISOString() : now;
        addUrl(p.canonical_url, lastmod, 'weekly', 0.8);
      }
    } catch { /* best effort */ }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`;
  }

  // ====================================================================
  // ROBOTS.TXT — instructs crawlers + points to the sitemap.
  // ====================================================================
  async robots(): Promise<string> {
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
      // admin publishing controls: whole entity types flipped off
      ...robotsDisallowLines(controls),
      '',
      `Sitemap: ${PUBLIC_BASE}/api/v1/seo/sitemap.xml`,
      '',
      '# AI crawlers — see llms.txt for a structured site overview',
      `# LLMS: ${PUBLIC_BASE}/api/v1/seo/llms.txt`,
      '',
    ].join('\n');
  }

  // ====================================================================
  // LLMS.TXT — structured site overview for AI search engines & LLM agents
  // (llmstxt.org convention). Generated from live data so answers about
  // Nabdah Plus cite correct services, specialties and coverage.
  // ====================================================================
  /** The Arabic page of an entity (the six localized pages are listed in the sitemap). */
  private arUrl(type: PublicEntityType, e: any, cities: string[] = []): string | null {
    const path = localizedPaths(type, e, 'ar', cities)[0];
    return path ? `${siteOrigin()}${path}` : null;
  }

  async llmsTxt(): Promise<string> {
    const lines: string[] = [];
    lines.push('# Nabd (نَبْض)');
    lines.push('');
    lines.push(
      '> Saudi healthcare super-app: book doctors (clinic, video, home visit), order medicines with delivery, book lab tests, radiology, nursing and home-care visits — with Saudi insurance integration (bupa, Tawuniya, MedGulf and more), Moyasar payments, and real-time telehealth.',
    );
    lines.push('');
    lines.push('## Platform');
    lines.push('');
    lines.push(`- [Homepage](${PUBLIC_BASE}/): patient, provider and pharmacy apps plus an admin dashboard`);
    lines.push(`- [Sitemap](${PUBLIC_BASE}/api/v1/seo/sitemap.xml): every public doctor, medicine, service, facility and article`);
    lines.push('');

    // ── Doctors (live top-rated sample) ──────────────────────────
    try {
      const doctors = await this.providerM
        .find(this.publicQuery('doctor', true), { id: 1, slug: 1, name_ar: 1, name_en: 1, full_name: 1, specialty: 1, city: 1, rating_avg: 1 })
        .sort({ rating_avg: -1 })
        .limit(30)
        .lean();
      if (doctors.length) {
        lines.push('## Doctors (أطباء)');
        lines.push('');
        for (const d of doctors as any[]) {
          const name = d.name_ar || d.name_en || d.full_name || 'Doctor';
          const meta = [d.specialty, d.city].filter(Boolean).join(' · ');
          const url = this.arUrl('doctor', d);
          if (url) lines.push(`- [${name}](${url})${meta ? `: ${meta}` : ''}`);
        }
        lines.push('');
      }
    } catch { /* best-effort */ }

    // ── Pharmacies ───────────────────────────────────────────────
    try {
      const pharmacies = await this.conn.collection('provider_profiles')
        .find({ ...this.publicQuery('doctor', true), type: 'pharmacy' }, { projection: { id: 1, name_ar: 1, name_en: 1, city: 1, slug: 1 } })
        .limit(20)
        .toArray();
      if (pharmacies.length) {
        lines.push('## Pharmacies (صيدليات)');
        lines.push('');
        for (const p of pharmacies) {
          const name = p.name_ar || p.name_en || 'Pharmacy';
          const url = this.arUrl('pharmacy', p);
          if (url) lines.push(`- [${name}](${url})${p.city ? `: ${p.city}` : ''}`);
        }
        lines.push('');
      }
    } catch { /* best-effort */ }

    // ── Hospitals & Clinics ──────────────────────────────────────
    try {
      const facilities = await this.facilityM
        .find(this.publicQuery('facility', true), { id: 1, slug: 1, name_ar: 1, name_en: 1, city: 1, type: 1 })
        .limit(20)
        .lean();
      if (facilities.length) {
        lines.push('## Hospitals & Clinics (مستشفيات وعيادات)');
        lines.push('');
        for (const f of facilities as any[]) {
          const name = f.name_ar || f.name_en || 'Facility';
          const url = this.arUrl('facility', f);
          if (url) lines.push(`- [${name}](${url})${f.city ? `: ${f.city}` : ''}`);
        }
        lines.push('');
      }
    } catch { /* best-effort */ }

    // ── Medicines ────────────────────────────────────────────────
    try {
      const meds = await this.medM
        .find(this.publicQuery('medicine', true), { id: 1, slug: 1, translations: 1, name_ar: 1, name_en: 1, category: 1 })
        .limit(30)
        .lean();
      if (meds.length) {
        lines.push('## Medicines (أدوية)');
        lines.push('');
        for (const m of meds as any[]) {
          const name = m.name_ar || m.name_en || 'Medicine';
          const url = this.arUrl('medicine', m);
          if (url) lines.push(`- [${name}](${url})${m.category ? `: ${m.category}` : ''}`);
        }
        lines.push('');
      }
    } catch { /* best-effort */ }

    // ── Services: labs, radiology, home care ─────────────────────
    try {
      const labSvcs = await this.labSvcM
        .find(this.publicQuery('lab-service', true), { id: 1, slug: 1, short_code: 1, name_ar: 1, name_en: 1 })
        .limit(15)
        .lean();
      const firstCity = (await publicCitySlugs(this.conn))[0];
      if (labSvcs.length && firstCity) {
        lines.push('## Lab tests (تحاليل مخبرية)');
        lines.push('');
        for (const s of labSvcs as any[]) {
          const name = s.name_ar || s.name_en || 'Lab service';
          const url = this.arUrl('lab_service', s, [firstCity]);
          if (url) lines.push(`- [${name}](${url})`);
        }
        lines.push('');
      }
    } catch { /* best-effort */ }

    try {
      const hcSvcs = await this.hcSvcM
        .find(this.publicQuery('home-care-service', true), { id: 1, name_ar: 1, name_en: 1 })
        .limit(15)
        .lean();
      if (hcSvcs.length) {
        lines.push('## Nursing & home care (تمريض ورعاية منزلية)');
        lines.push('');
        for (const s of hcSvcs as any[]) {
          const name = s.name_ar || s.name_en || 'Home-care service';
          const url = this.arUrl('home_care_service', s);
          if (url) lines.push(`- [${name}](${url})`);
        }
        lines.push('');
      }
    } catch { /* best-effort */ }

    // ── Articles (health content hub) ────────────────────────────
    try {
      const articles = await this.articleM
        .find(this.publicQuery('article', true), { id: 1, slug: 1, title_ar: 1, title_en: 1, category: 1 })
        .limit(20)
        .lean();
      if (articles.length) {
        lines.push('## Health articles (مقالات صحية)');
        lines.push('');
        for (const a of articles as any[]) {
          const title = a.title_ar || a.title_en || 'Article';
          const url = this.arUrl('article', a);
          if (url) lines.push(`- [${title}](${url})${a.category ? `: ${a.category}` : ''}`);
        }
        lines.push('');
      }
    } catch { /* best-effort */ }

    lines.push('## Contact & coverage');
    lines.push('');
    lines.push('- Coverage: Saudi Arabia (Riyadh, Jeddah, Dammam and expanding)');
    lines.push('- Payments: mada, Visa, Mastercard, Apple Pay (via Moyasar), cash in clinic, Saudi insurance networks');
    lines.push('');
    return lines.join('\n');
  }
}
