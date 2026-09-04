import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { EventBusService } from './event-bus.service';
import { buildSlug } from '../../common/slug.util';

export type PipelineEntityType =
  | 'doctor'
  | 'pharmacy'
  | 'hospital'
  | 'clinic'
  | 'lab'
  | 'radiology'
  | 'nursing'
  | 'service'
  | 'lab_test'
  | 'radiology_service'
  | 'medicine';

export interface PipelineEntityInput {
  entityType: PipelineEntityType;
  entityId: string;
  actorId?: string;
  actorRole?: string;
  reason?: string;
  action?: 'create' | 'update' | 'deactivate' | 'reactivate' | 'delete';
}

const PUBLIC_BASE = process.env.NABD_PUBLIC_URL || 'https://nabd.plus';

const COLLECTION_MAP: Record<PipelineEntityType, string> = {
  doctor: 'provider_profiles',
  pharmacy: 'provider_profiles',
  hospital: 'facilities',
  clinic: 'facilities',
  lab: 'facilities',
  radiology: 'facilities',
  nursing: 'provider_profiles',
  service: 'homecareservices',
  lab_test: 'labservices',
  radiology_service: 'radiologyservices',
  medicine: 'medicines_master',
};

/** Multilingual health vocabulary terms across Arabic, English, Urdu, Hindi, Tagalog, and Bengali */
const VOCABULARY_DICTIONARY: Record<string, Record<string, string[]>> = {
  doctor: {
    ar: ['طبيب', 'دكتور', 'استشاري', 'أخصائي'],
    en: ['doctor', 'physician', 'specialist', 'consultant'],
    ur: ['ڈاکٹر', 'طبیب', 'ماہر امراض'],
    hi: ['डॉक्टर', 'चिकित्सक'],
    fil: ['doktor', 'manggagamot'],
    bn: ['ডাক্তার', 'চিকিৎসক'],
  },
  pharmacy: {
    ar: ['صيدلية', 'دواء', 'صيدلي', 'علاج'],
    en: ['pharmacy', 'chemist', 'drugstore', 'medicine'],
    ur: ['فارمیسی', 'دواخانہ', 'میڈیکل سٹور'],
    hi: ['फार्मेसी', 'दवाखाना'],
    fil: ['botika', 'parmasya'],
    bn: ['ফার্মেসি', 'ওষুধের দোকান'],
  },
  lab: {
    ar: ['مختبر', 'تحاليل', 'فحص دم'],
    en: ['laboratory', 'lab', 'blood test', 'diagnostic lab'],
    ur: ['لیبارٹری', 'خون کا ٹیسٹ'],
    hi: ['प्रयोगशाला', 'लैब टेस्ट'],
    fil: ['laboratoryo', 'pagsusuri sa dugo'],
    bn: ['ল্যাবরেটরি', 'রক্ত পরীক্ষা'],
  },
  radiology: {
    ar: ['أشعة', 'رنين مغناطيسي', 'أشعة سينية', 'سونار'],
    en: ['radiology', 'xray', 'mri', 'ultrasound', 'ct scan'],
    ur: ['ریڈیالوجی', 'ایکس رے'],
    hi: ['रेडियोलॉजी', 'एक्स-रे'],
    fil: ['radiology', 'x-ray'],
    bn: ['রেডিওলজি', 'এক্স-রে'],
  },
  nursing: {
    ar: ['تمريض', 'رعاية منزلية', 'ممرض', 'ممرضة'],
    en: ['nursing', 'home care', 'nurse', 'home visit'],
    ur: ['نرسنگ', 'ہوم کیئر'],
    hi: ['नर्सिंग', 'होम केयर'],
    fil: ['narsing', 'pag-aalaga sa bahay'],
    bn: ['নার্সিং', 'হোম কেয়ার'],
  },
  medicine: {
    ar: ['دواء', 'علاج', 'حبوب', 'شراب'],
    en: ['medicine', 'medication', 'drug', 'pharmaceutical'],
    ur: ['دوا', 'گولی'],
    hi: ['दवा', 'औषधि'],
    fil: ['gamot', 'tableta'],
    bn: ['ওষুধ', 'ট্যাবলেট'],
  },
};

@Injectable()
export class AutoEntitySeoPipelineService {
  private readonly logger = new Logger(AutoEntitySeoPipelineService.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly redis: RedisService,
    private readonly events: EventBusService,
  ) {}

  /**
   * Find the authoritative source document for the entity across primary collections.
   */
  async findSourceDocument(entityType: PipelineEntityType, entityId: string): Promise<{ doc: any; collection: string } | null> {
    const primaryCol = COLLECTION_MAP[entityType];
    let doc = await this.conn.collection(primaryCol).findOne({ $or: [{ id: entityId }, { _id: entityId } as any] });
    if (doc) return { doc, collection: primaryCol };

    // Fallback: Check provider_profiles if it was supposed to be a facility or vice-versa
    if (['hospital', 'clinic', 'lab', 'radiology'].includes(entityType)) {
      doc = await this.conn.collection('provider_profiles').findOne({ $or: [{ id: entityId }, { _id: entityId } as any] });
      if (doc) return { doc, collection: 'provider_profiles' };
    }
    if (['nursing', 'pharmacy'].includes(entityType)) {
      doc = await this.conn.collection('facilities').findOne({ $or: [{ id: entityId }, { _id: entityId } as any] });
      if (doc) return { doc, collection: 'facilities' };
    }

    return null;
  }

  /**
   * Ensure a stable canonical slug without collisions.
   */
  async ensureCanonicalSlug(entityType: PipelineEntityType, doc: any, collection: string): Promise<string> {
    const id = doc.id || String(doc._id);
    const existingSlug = doc.slug;

    // If slug already exists and is well-formed, check if it's uniquely claimed by this doc
    if (existingSlug && typeof existingSlug === 'string' && existingSlug.trim()) {
      const collision = await this.conn.collection(collection).findOne({
        slug: existingSlug,
        id: { $ne: id },
      });
      if (!collision) return existingSlug;
    }

    // Generate base slug from Arabic or English name
    const rawName = doc.name_ar || doc.name_en || doc.name || doc.full_name || doc.title_ar || doc.title_en || 'entity';
    const baseSlug = buildSlug(rawName, id);

    let candidate = baseSlug;
    let attempt = 1;

    // Resolve collision against same collection and projections
    while (true) {
      const [colMatch, projMatch] = await Promise.all([
        this.conn.collection(collection).findOne({ slug: candidate, id: { $ne: id } }),
        this.conn.collection('public_catalog_projections').findOne({ slug: candidate, entity_id: { $ne: id } }),
      ]);

      if (!colMatch && !projMatch) break;

      attempt += 1;
      candidate = `${baseSlug}-${attempt}`;
    }

    // Persist assigned slug back to the source collection
    await this.conn.collection(collection).updateOne(
      { $or: [{ id }, { _id: doc._id }] },
      { $set: { slug: candidate, updatedAt: new Date() } },
    );

    return candidate;
  }

  /**
   * Compute canonical path by entity type.
   */
  computeCanonicalPath(entityType: PipelineEntityType, slug: string): string {
    const encoded = encodeURIComponent(slug);
    switch (entityType) {
      case 'doctor':
        return `/doctor/${encoded}`;
      case 'pharmacy':
        return `/pharmacy/${encoded}`;
      case 'hospital':
      case 'clinic':
      case 'lab':
      case 'radiology':
      case 'nursing':
        return `/facility/${encoded}`;
      case 'service':
        return `/home-care/services/${encoded}`;
      case 'lab_test':
        return `/labs/${encoded}`;
      case 'radiology_service':
        return `/radiology/services/${encoded}`;
      case 'medicine':
        return `/p/${encoded}`;
    }
  }

  /**
   * Determine publication and indexing eligibility based on strict medical/license governance.
   */
  isEligible(entityType: PipelineEntityType, doc: any, action?: string): { published: boolean; indexable: boolean } {
    if (action === 'deactivate' || action === 'delete') {
      return { published: false, indexable: false };
    }

    // Soft delete check
    if (doc.is_deleted === true || doc.deleted === true) {
      return { published: false, indexable: false };
    }

    const isCatalog = ['medicine', 'service', 'lab_test', 'radiology_service'].includes(entityType);

    if (isCatalog) {
      const active = doc.active !== false && doc.is_deleted !== true && doc.unavailable !== true;
      const reviewOk = doc.medical_review_status !== 'rejected' && doc.medical_review_status !== 'suspended';
      const publicEligible = doc.public_eligibility !== false;
      const indexingEligible = doc.indexing_eligibility !== false;
      const published = active && reviewOk && publicEligible;
      const indexable = published && indexingEligible;
      return { published, indexable };
    }

    // Provider check
    const status = String(doc.status || doc.license_status || '').toLowerCase();
    const isOperational = status === 'active' || doc.is_active === true || status === 'verified';
    const isSuspendedOrRejected = status === 'suspended' || status === 'rejected' || doc.is_active === false;
    if (isSuspendedOrRejected) {
      return { published: false, indexable: false };
    }

    const isVerified =
      doc.license_verified === true ||
      doc.medical_review_status === 'approved' ||
      status === 'verified' ||
      status === 'active';

    const publicEligible = doc.public_eligibility !== false;
    const indexingEligible = doc.indexing_eligibility !== false;

    const published = isOperational && isVerified && publicEligible;
    const indexable = published && indexingEligible;

    return { published, indexable };
  }

  /**
   * Build Schema.org structured data JSON-LD.
   */
  buildStructuredData(entityType: PipelineEntityType, doc: any, canonicalUrl: string): Record<string, any> {
    const name = doc.name_ar || doc.name_en || doc.name || doc.full_name || doc.title_ar || 'Nabd Healthcare';
    const base: Record<string, any> = {
      '@context': 'https://schema.org',
      name,
      url: canonicalUrl,
      inLanguage: ['ar', 'en'],
    };

    if (doc.image || doc.photo_url || doc.avatar || doc.logo_url) {
      base.image = doc.image || doc.photo_url || doc.avatar || doc.logo_url;
    }

    switch (entityType) {
      case 'doctor':
        return {
          ...base,
          '@type': 'Physician',
          medicalSpecialty: doc.specialty || 'General Medicine',
          address: {
            '@type': 'PostalAddress',
            addressLocality: doc.city || 'Riyadh',
            addressCountry: 'SA',
          },
          priceRange: doc.price_clinic ? `SAR ${doc.price_clinic}` : undefined,
          aggregateRating: doc.rating_avg ? {
            '@type': 'AggregateRating',
            ratingValue: doc.rating_avg,
            reviewCount: doc.rating_count || doc.reviews_count || 1,
          } : undefined,
        };

      case 'pharmacy':
        return {
          ...base,
          '@type': 'Pharmacy',
          address: {
            '@type': 'PostalAddress',
            addressLocality: doc.city || 'Riyadh',
            addressCountry: 'SA',
            streetAddress: doc.address || doc.district,
          },
          paymentAccepted: 'Cash, Credit Card, Mada, Apple Pay',
          currenciesAccepted: 'SAR',
          openingHours: 'Mo-Su 00:00-23:59',
        };

      case 'hospital':
        return {
          ...base,
          '@type': 'Hospital',
          address: {
            '@type': 'PostalAddress',
            addressLocality: doc.city || 'Riyadh',
            addressCountry: 'SA',
          },
          availableService: doc.services || ['Emergency', 'Inpatient', 'Consultations'],
        };

      case 'clinic':
        return {
          ...base,
          '@type': 'MedicalClinic',
          medicalSpecialty: doc.specialties || doc.specialty || 'Multispecialty',
          address: {
            '@type': 'PostalAddress',
            addressLocality: doc.city || 'Riyadh',
            addressCountry: 'SA',
          },
        };

      case 'lab':
        return {
          ...base,
          '@type': 'MedicalBusiness',
          name: `${name} - Medical Laboratory`,
          address: {
            '@type': 'PostalAddress',
            addressLocality: doc.city || 'Riyadh',
            addressCountry: 'SA',
          },
        };

      case 'radiology':
        return {
          ...base,
          '@type': 'MedicalBusiness',
          name: `${name} - Diagnostic Imaging`,
          address: {
            '@type': 'PostalAddress',
            addressLocality: doc.city || 'Riyadh',
            addressCountry: 'SA',
          },
        };

      case 'nursing':
        return {
          ...base,
          '@type': 'MedicalBusiness',
          name: `${name} - Home Nursing & Care`,
          address: {
            '@type': 'PostalAddress',
            addressLocality: doc.city || 'Riyadh',
            addressCountry: 'SA',
          },
        };

      case 'service':
        return {
          ...base,
          '@type': 'MedicalProcedure',
          procedureType: doc.category || 'Nursing',
          offers: doc.price ? {
            '@type': 'Offer',
            price: doc.price,
            priceCurrency: 'SAR',
            availability: 'https://schema.org/InStock',
          } : undefined,
        };

      case 'lab_test':
        return {
          ...base,
          '@type': 'MedicalTest',
          sampleType: doc.sample_type || 'Blood',
          offers: doc.price ? {
            '@type': 'Offer',
            price: doc.price,
            priceCurrency: 'SAR',
            availability: 'https://schema.org/InStock',
          } : undefined,
        };

      case 'radiology_service':
        return {
          ...base,
          '@type': 'MedicalProcedure',
          bodyLocation: doc.body_part || 'General',
          offers: doc.price ? {
            '@type': 'Offer',
            price: doc.price,
            priceCurrency: 'SAR',
            availability: 'https://schema.org/InStock',
          } : undefined,
        };

      case 'medicine':
        return {
          ...base,
          '@type': 'Drug',
          activeIngredient: doc.active_ingredient,
          drugUnit: doc.form || 'tablet',
          prescriptionStatus: doc.requires_prescription ? 'prescription' : 'otc',
          offers: doc.price ? {
            '@type': 'Offer',
            price: doc.price,
            priceCurrency: 'SAR',
            availability: 'https://schema.org/InStock',
          } : undefined,
        };
    }
  }

  /**
   * Build multilingual search tokens and aliases for NLP/search indexing.
   */
  buildMultilingualTokens(entityType: PipelineEntityType, doc: any): Record<string, string[]> {
    const vocab = VOCABULARY_DICTIONARY[entityType] || {};
    const tokens: Record<string, string[]> = {
      ar: [...(vocab.ar || [])],
      en: [...(vocab.en || [])],
      ur: [...(vocab.ur || [])],
      hi: [...(vocab.hi || [])],
      fil: [...(vocab.fil || [])],
      bn: [...(vocab.bn || [])],
    };

    if (doc.name_ar) tokens.ar.push(doc.name_ar);
    if (doc.name_en) tokens.en.push(doc.name_en);
    if (doc.specialty) {
      tokens.ar.push(doc.specialty);
      tokens.en.push(doc.specialty);
    }
    if (doc.active_ingredient) {
      tokens.ar.push(doc.active_ingredient);
      tokens.en.push(doc.active_ingredient);
    }
    if (doc.city) {
      tokens.ar.push(doc.city);
      tokens.en.push(doc.city);
    }

    return tokens;
  }

  /**
   * Invalidate application and Redis caches for the entity.
   */
  async invalidateCaches(entityType: PipelineEntityType, entityId: string, slug?: string) {
    const keys = [
      `public:catalog:${entityType}:${entityId}`,
      `public:catalog:${entityType}:list`,
      `seo:resolve:${entityType}:${entityId}`,
      `seo:sitemap:xml`,
      `seo:llms:txt`,
      `mcp:entities:cache`,
    ];
    if (slug) {
      keys.push(`seo:resolve:${entityType}:${slug}`);
      keys.push(`public:catalog:${entityType}:${slug}`);
    }
    await Promise.all(keys.map((k) => this.redis.del(k).catch(() => {})));
  }

  /**
   * Core orchestrator method: processes an entity, resolves slug, builds SEO,
   * handles sitemap, updates projections, and emits publication events.
   */
  async processEntity(input: PipelineEntityInput): Promise<any> {
    const sourceResult = await this.findSourceDocument(input.entityType, input.entityId);
    if (!sourceResult) {
      this.logger.warn(`Source document not found for ${input.entityType}:${input.entityId}`);
      return null;
    }

    const { doc, collection } = sourceResult;
    const now = new Date();

    // 1. Resolve canonical slug
    const slug = await this.ensureCanonicalSlug(input.entityType, doc, collection);
    const canonicalPath = this.computeCanonicalPath(input.entityType, slug);
    const canonicalUrl = `${PUBLIC_BASE}/ar${canonicalPath}`;

    // 2. Check eligibility
    const { published, indexable } = this.isEligible(input.entityType, doc, input.action);

    // 3. Generate SEO & Schema.org data
    const structuredData = this.buildStructuredData(input.entityType, doc, canonicalUrl);
    const multilingualTokens = this.buildMultilingualTokens(input.entityType, doc);

    const titleAr = doc.name_ar || doc.name || doc.full_name || 'نبض بلس';
    const titleEn = doc.name_en || doc.name || doc.full_name || 'Nabd Plus';

    const projection = {
      entity_type: input.entityType,
      entity_id: doc.id || String(doc._id),
      slug,
      source_collection: collection,
      source_updated_at: doc.updatedAt || now,
      published,
      indexable,
      canonical_path: canonicalPath,
      canonical_url: canonicalUrl,
      deep_link: `nabdplus://${input.entityType}/${encodeURIComponent(slug)}`,
      sitemap: {
        included: indexable,
        lastmod: doc.updatedAt || now,
      },
      metadata: {
        title_ar: titleAr,
        title_en: titleEn,
        robots: indexable ? 'index,follow' : 'noindex,nofollow',
        description_ar: doc.description_ar || doc.bio || `${titleAr} عبر منصة نبض بلس للرعاية الصحية في المملكة العربية السعودية`,
        description_en: doc.description_en || doc.bio || `${titleEn} on Nabd Plus Health Platform in Saudi Arabia`,
      },
      schema_org: structuredData,
      multilingual_tokens: multilingualTokens,
      relationships: {
        city: doc.city || null,
        district: doc.district || null,
        specialty: doc.specialty || null,
        facility_id: doc.facility_id || null,
        active_ingredient: doc.active_ingredient || null,
        accepted_insurance: doc.accepted_insurance || [],
      },
      updated_at: now,
    };

    // 4. Update Materialized Projection
    await this.conn.collection('public_catalog_projections').updateOne(
      { entity_type: input.entityType, entity_id: projection.entity_id },
      {
        $set: projection,
        $setOnInsert: { created_at: now },
      },
      { upsert: true },
    );

    // 5. Invalidate Caches
    await this.invalidateCaches(input.entityType, projection.entity_id, slug);

    // 6. Emit Event
    await this.events.emit({
      type: 'entity.pipeline.projected',
      entity_type: input.entityType,
      entity_id: projection.entity_id,
      actor_account_id: input.actorId || 'system',
      actor_role: input.actorRole || 'admin',
      reason_code: input.reason || input.action || 'pipeline_refresh',
      meta: {
        slug,
        canonical_url: canonicalUrl,
      },
      after: {
        published,
        indexable,
        canonical_path: canonicalPath,
      },
    });

    this.logger.log(`[AutoSEO] Entity projected: ${input.entityType}:${projection.entity_id} (slug: ${slug}, indexable: ${indexable})`);
    return projection;
  }
}
