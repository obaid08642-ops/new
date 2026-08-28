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
exports.CatalogPublicationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const redis_service_1 = require("../redis/redis.service");
const event_bus_service_1 = require("./event-bus.service");
const SOURCE_COLLECTIONS = {
    medicine: 'medicines_master',
    provider: 'provider_profiles',
    facility: 'facilities',
    lab_service: 'labservices',
    radiology_service: 'radiologyservices',
    home_care_service: 'homecareservices',
};
let CatalogPublicationService = class CatalogPublicationService {
    constructor(conn, redis, events) {
        this.conn = conn;
        this.redis = redis;
        this.events = events;
        this.logger = new common_1.Logger('CatalogPublication');
    }
    isOperational(entityType, source) {
        if (entityType === 'medicine')
            return source.is_deleted !== true;
        if (entityType === 'provider')
            return String(source.status || '').toLowerCase() === 'active';
        if (entityType === 'facility')
            return source.is_active === true;
        return source.active === true && source.is_deleted !== true;
    }
    canonicalPath(entityType, source) {
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
    deepLink(entityType, source) {
        const token = encodeURIComponent(source.id);
        return `nabdplus://${entityType}/${token}`;
    }
    async invalidateCaches(entityType, entityId) {
        const keys = [
            `public:catalog:${entityType}:${entityId}`,
            `public:catalog:${entityType}:list`,
            `seo:resolve:${entityType}:${entityId}`,
        ];
        await Promise.all(keys.map((key) => this.redis.del(key)));
    }
    async refresh(input) {
        const source = await this.conn.collection(SOURCE_COLLECTIONS[input.entityType]).findOne({ id: input.entityId });
        if (!source)
            throw new Error(`catalog_source_not_found:${input.entityType}:${input.entityId}`);
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
        await this.conn.collection('public_catalog_projections').updateOne({ entity_type: input.entityType, entity_id: source.id }, {
            $set: projection,
            $setOnInsert: { created_at: now },
        }, { upsert: true });
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
};
exports.CatalogPublicationService = CatalogPublicationService;
exports.CatalogPublicationService = CatalogPublicationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        redis_service_1.RedisService,
        event_bus_service_1.EventBusService])
], CatalogPublicationService);
//# sourceMappingURL=catalog-publication.service.js.map