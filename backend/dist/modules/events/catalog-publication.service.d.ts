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
    idempotencyKey: string;
}
export declare class CatalogPublicationService {
    private readonly conn;
    private readonly redis;
    private readonly events;
    private readonly logger;
    constructor(conn: Connection, redis: RedisService, events: EventBusService);
    private isOperational;
    private canonicalPath;
    private deepLink;
    private invalidateCaches;
    refresh(input: CatalogPublicationInput): Promise<{
        entity_type: CatalogEntityType;
        entity_id: any;
        source_collection: string;
        source_updated_at: any;
        public_eligibility: boolean;
        indexing_eligibility: boolean;
        medical_review_status: any;
        last_reviewed: any;
        provenance: any;
        published: boolean;
        indexable: boolean;
        canonical_path: string;
        deep_link: string;
        sitemap: {
            included: boolean;
            lastmod: any;
        };
        feed: {
            included: boolean;
        };
        metadata: {
            robots: string;
        };
        last_event_key: string;
        updated_at: Date;
    }>;
}
