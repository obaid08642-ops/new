import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { EventBusService } from './event-bus.service';

export type CatalogEntityType = 'medicine' | 'provider' | 'facility' | 'lab_service' | 'radiology_service' | 'home_care_service';

export interface CatalogPublicationInput {
  entityType: CatalogEntityType;
  entityId: string;
  actorId: string;
  actorRole?: string;
  reason: string;
  /** Stable command identifier. Repeating the same command is intentionally safe. */
  idempotencyKey: string;
}

const SOURCE_COLLECTIONS: Record<CatalogEntityType, string> = {
  medicine: 'medicines_master',
  provider: 'provider_profiles',
  facility: 'facilities',
  lab_service: 'labservices',
  radiology_service: 'radiologyservices',
  home_care_service: 'homecareservices',
};

/**
 * Materializes a minimal public-discovery projection synchronously after a
 * governed admin decision. The source record remains authoritative; this
 * projection is an audited cache/index boundary and never a second editing
 * surface. No queue, crawler, or external publisher is started here.
 */
@Injectable()
export class CatalogPublicationService {
  private readonly logger = new Logger('CatalogPublication');

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly redis: RedisService,
    private readonly events: EventBusService,
  ) {}

  private isOperational(entityType: CatalogEntityType, source: any): boolean {
    if (entityType === 'medicine') return source.is_deleted !== true;
    if (entityType === 'provider') return String(source.status || '').toLowerCase() === 'active';
    if (entityType === 'facility') return source.is_active === true;
    return source.active === true && source.is_deleted !== true;
  }

  private canonicalPath(entityType: CatalogEntityType, source: any): string {
    const token = encodeURIComponent(source.slug || source.id);
    switch (entityType) {
      case 'medicine': return `/medicines/${token}`;
      case 'provider': return `/providers/${token}`;
      case 'facility': return `/care/facilities/${token}`;
      case 'lab_service': return `/lab/services/${token}`;
      case 'radiology_service': return `/radiology/services/${token}`;
      case 'home_care_service': return `/home-care/services/${token}`;
    }
  }

  private deepLink(entityType: CatalogEntityType, source: any): string {
    const token = encodeURIComponent(source.id);
    return `nabdplus://${entityType}/${token}`;
  }

  private async invalidateCaches(entityType: CatalogEntityType, entityId: string) {
    const keys = [
      `public:catalog:${entityType}:${entityId}`,
      `public:catalog:${entityType}:list`,
      `seo:resolve:${entityType}:${entityId}`,
    ];
    await Promise.all(keys.map((key) => this.redis.del(key)));
  }

  async refresh(input: CatalogPublicationInput) {
    const source = await this.conn.collection(SOURCE_COLLECTIONS[input.entityType]).findOne({ id: input.entityId });
    if (!source) throw new Error(`catalog_source_not_found:${input.entityType}:${input.entityId}`);

    const publicEligible = source.public_eligibility === true;
    const medicalApproved = source.medical_review_status === 'approved';
    const published = publicEligible && medicalApproved && this.isOperational(input.entityType, source);
    const indexable = published && source.indexing_eligibility === true;
    const now = new Date();
    const canonicalPath = this.canonicalPath(input.entityType, source);

    const projection = {
      entity_type: input.entityType,
      entity_id: source.id,
      source_collection: SOURCE_COLLECTIONS[input.entityType],
      source_updated_at: source.updatedAt || now,
      public_eligibility: publicEligible,
      indexing_eligibility: source.indexing_eligibility === true,
      medical_review_status: source.medical_review_status || 'pending',
      last_reviewed: source.last_reviewed || null,
      provenance: source.provenance || null,
      published,
      indexable,
      canonical_path: canonicalPath,
      deep_link: this.deepLink(input.entityType, source),
      sitemap: {
        included: indexable,
        lastmod: source.last_reviewed || source.updatedAt || now,
      },
      feed: { included: published },
      metadata: { robots: indexable ? 'index,follow' : 'noindex,nofollow' },
      last_event_key: input.idempotencyKey,
      updated_at: now,
    };

    await this.conn.collection('public_catalog_projections').updateOne(
      { entity_type: input.entityType, entity_id: source.id },
      {
        $set: projection,
        $setOnInsert: { created_at: now },
      },
      { upsert: true },
    );
    await this.invalidateCaches(input.entityType, source.id);

    await this.events.emit({
      type: 'catalog.publication.projected',
      entity_type: input.entityType,
      entity_id: source.id,
      idempotency_key: input.idempotencyKey,
      actor_account_id: input.actorId,
      actor_role: input.actorRole || 'admin',
      reason_code: input.reason,
      after: {
        published,
        indexable,
        medical_review_status: projection.medical_review_status,
      },
      meta: {
        idempotency_key: input.idempotencyKey,
        source_collection: SOURCE_COLLECTIONS[input.entityType],
        canonical_path: canonicalPath,
        deep_link: projection.deep_link,
        sitemap_included: indexable,
        feed_included: published,
      },
    });

    this.logger.log(`projection_refreshed entity=${input.entityType}:${source.id} published=${published} key=${input.idempotencyKey}`);
    return projection;
  }
}
