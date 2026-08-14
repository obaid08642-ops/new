// @ts-nocheck
import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildSlug, parseSlugSuffix, slugify } from '../../common/slug.util';
import { MedicineRepository } from "./repositories/medicine.repository";
import { LabServiceRepository } from "./repositories/labservice.repository";
import { HomeCareServiceRepository } from "./repositories/homecareservice.repository";
import { FacilityRepository } from "./repositories/facility.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";

export type EntityType = 'medicine' | 'doctor' | 'lab-service' | 'home-care-service' | 'facility';

const PUBLIC_BASE = process.env.NABD_PUBLIC_URL || 'https://nabd.app';

@Injectable()
export class SeoService {
  constructor(
    @Inject('MedicineRepository') private medM: MedicineRepository,
    @Inject('LabServiceRepository') private labSvcM: LabServiceRepository,
    @Inject('HomeCareServiceRepository') private hcSvcM: HomeCareServiceRepository,
    @Inject('FacilityRepository') private facilityM: FacilityRepository,
    @Inject('ProviderProfileRepository') private providerM: ProviderProfileRepository,
  ) {}

  private modelFor(type: string): Model<any> | null {
    switch (type) {
      case 'medicine': return this.medM;
      case 'lab-service': return this.labSvcM;
      case 'home-care-service': return this.hcSvcM;
      case 'doctor': return this.providerM;
      case 'facility': return this.facilityM;
      default: return null;
    }
  }

  /** Look up an entity by a slug like "panadol-extra-a1b2c3". */
  async resolve(type: string, slug: string) {
    const model = this.modelFor(type);
    if (!model) return null;

    // First try: exact match on slug property
    const exact = await model.findOne({ slug, is_deleted: { $ne: true } }, { _id: 0, __v: 0 }).lean();
    if (exact) return exact;

    const sfx = parseSlugSuffix(slug);
    if (!sfx) {
      // No id suffix — try fuzzy by name
      const re = new RegExp(slug.replace(/-/g, ' '), 'i');
      return model.findOne(
        { $or: [{ name_en: re }, { name_ar: re }, { full_name: re }], is_deleted: { $ne: true } },
        { _id: 0, __v: 0 },
      ).lean();
    }
    // Match the id-prefix (first 6 hex chars after stripping dashes)
    const reId = new RegExp(`^${sfx}`, 'i');
    return model.findOne({ id: { $regex: reId }, is_deleted: { $ne: true } } as any, { _id: 0, __v: 0 }).lean();
  }

  /** Build meta tags for an entity slug. */
  async meta(type: string, slug: string) {
    const entity: any = await this.resolve(type, slug);
    if (!entity) {
      return {
        found: false,
        title: 'Nabd — نبض',
        description: 'تطبيق نبض للرعاية الصحية الشاملة',
      };
    }

    const name = entity.name_ar || entity.name_en || entity.full_name || 'Nabd item';
    const desc = this.composeDescription(type, entity);
    const image = entity.image || entity.avatar || entity.cover || undefined;
    const url = this.buildShareUrl(type, name, entity.id);

    return {
      found: true,
      type,
      id: entity.id,
      slug: buildSlug(name, entity.id),
      title: `${name} • نبض`,
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
        site_name: 'Nabd — نبض',
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
    const entity: any = await model.findOne({ id }, { _id: 0 }).lean();
    if (!entity) return { ok: false, reason: 'not_found' };
    const name = entity.name_ar || entity.name_en || entity.full_name || 'item';
    return {
      ok: true,
      url: this.buildShareUrl(type, name, id),
      slug: buildSlug(name, id),
      deep_link: `nabd://${type}/${id}`,
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
        return parts.join(' • ') || 'Available on Nabd — نبض';
      }
      case 'doctor': {
        const parts = [
          e.specialty && `${e.specialty}`,
          e.experience_years && `خبرة ${e.experience_years}+ سنوات`,
          e.consultation_fee && `رسوم الاستشارة: ${e.consultation_fee} ر.س`,
        ].filter(Boolean);
        return parts.join(' • ') || 'طبيب على نبض';
      }
      case 'lab-service': {
        const parts = [
          e.category && e.category,
          typeof e.price === 'number' && `${e.price} ر.س`,
          e.turnaround_hours && `النتيجة خلال ${e.turnaround_hours} ساعة`,
        ].filter(Boolean);
        return parts.join(' • ') || 'خدمة تحاليل على نبض';
      }
      case 'home-care-service': {
        const parts = [
          e.category && e.category,
          typeof e.price === 'number' && `${e.price} ر.س`,
          e.duration && `المدة: ${e.duration}`,
        ].filter(Boolean);
        return parts.join(' • ') || 'رعاية منزلية على نبض';
      }
      default:
        return 'Nabd — نبض health super app';
    }
  }

  /** Basic Schema.org structured data for SEO crawlers. */
  private structuredData(type: string, e: any, url: string) {
    const name = e.name_ar || e.name_en || e.full_name;
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
      default:
        return base;
    }
  }

  // ====================================================================
  // SITEMAP — auto-generated XML listing every public entity.
  // Crawled by Google/Bing/Yandex when robots.txt points to it.
  // ====================================================================
  async sitemap(): Promise<string> {
    const now = new Date().toISOString();
    const urls: string[] = [];

    // Homepage + static landing
    urls.push(`<url><loc>${PUBLIC_BASE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);

    const pushEntities = async (
      type: string,
      model: Model<any>,
      query: any,
      priority = 0.7,
      changefreq = 'weekly',
    ) => {
      const docs = await model
        .find(query, { id: 1, name_ar: 1, name_en: 1, full_name: 1, updatedAt: 1 })
        .lean()
        .limit(5000); // safety cap per sitemap
      for (const d of docs as any[]) {
        const name = d.name_ar || d.name_en || d.full_name || 'item';
        const slug = buildSlug(name, d.id);
        const lastmod = d.updatedAt ? new Date(d.updatedAt).toISOString() : now;
        urls.push(
          `<url><loc>${PUBLIC_BASE}/s/${type}/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`,
        );
      }
    };

    // Public entities — adapt queries to your schemas
    await pushEntities('medicine', this.medM, { active: { $ne: false }, is_deleted: { $ne: true } }, 0.8);
    await pushEntities('doctor', this.providerM, { active: { $ne: false }, is_deleted: { $ne: true } }, 0.85, 'weekly');
    await pushEntities('lab-service', this.labSvcM, { active: { $ne: false }, is_deleted: { $ne: true } }, 0.7);
    await pushEntities('home-care-service', this.hcSvcM, { active: { $ne: false }, is_deleted: { $ne: true } }, 0.7);
    await pushEntities('facility', this.facilityM, { is_deleted: { $ne: true } }, 0.6, 'monthly');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
  }

  // ====================================================================
  // ROBOTS.TXT — instructs crawlers + points to the sitemap.
  // ====================================================================
  robots(): string {
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
      '',
      `Sitemap: ${PUBLIC_BASE}/api/v2/seo/sitemap.xml`,
      '',
    ].join('\n');
  }

  // ====================================================================
  // INDEX NOW PING — proactively notify Google & Bing when new entities are added.
  // Call this from create-medicine, register-doctor, etc. flows.
  // ====================================================================
  async pingIndexNow(type: string, id: string): Promise<{ ok: boolean }> {
    try {
      const model = this.modelFor(type);
      if (!model) return { ok: false };
      const entity: any = await model.findOne({ id }, { _id: 0 }).lean();
      if (!entity) return { ok: false };
      const name = entity.name_ar || entity.name_en || entity.full_name || 'item';
      const url = this.buildShareUrl(type, name, id);
      const key = process.env.INDEXNOW_KEY;
      if (!key) {
        // Soft-fail — endpoint exists but no key configured yet
        return { ok: false };
      }
      // Fire-and-forget HTTP POST to IndexNow (no SDK required)
      const fetch = (globalThis as any).fetch;
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
    } catch {
      return { ok: false };
    }
  }
}
