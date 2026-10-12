import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Connection } from 'mongoose';
import { IndexNowService } from './indexnow.service';
import {
  PUBLIC_ENTITY_COLLECTIONS, PublicEntityType, publicCitySlugs, publicUrlsFor,
} from './seo-public-urls';

/** Types whose pages depend on the list of public cities. */
const CITY_TYPES: PublicEntityType[] = ['lab_service'];
const SWEEP_TYPES: PublicEntityType[] = ['medicine', 'doctor', 'pharmacy', 'facility', 'article', 'lab_service', 'radiology_service', 'home_care_service', 'condition'];
const MAX_SWEEP_PER_TYPE = 2000;
const INDEXNOW_BATCH = 10_000;

/**
 * Tells IndexNow (Bing, Yandex, Seznam, Naver; Google reads the sitemaps) about every public URL
 * of an entity, in all six locales, the moment it is added, changed or removed. A removed entity
 * is pinged too: the crawler then sees its pages answer 404 and drops them.
 *
 * Events cover the governed decisions (catalog.publication.projected, provider approval /
 * suspension, catalog service approval, article changes). A sweep every 10 minutes also pings
 * anything whose updatedAt moved since the last sweep, for writers that emit no event.
 */
@Injectable()
export class SeoIndexingService {
  private readonly logger = new Logger(SeoIndexingService.name);
  private citiesCache: { at: number; cities: string[] } | null = null;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly indexNow: IndexNowService,
  ) {}

  private async cities(): Promise<string[]> {
    if (this.citiesCache && Date.now() - this.citiesCache.at < 3600_000) return this.citiesCache.cities;
    const cities = await publicCitySlugs(this.conn);
    this.citiesCache = { at: Date.now(), cities };
    return cities;
  }

  private async load(type: PublicEntityType, id: string): Promise<Record<string, any> | null> {
    const col = this.conn.collection(PUBLIC_ENTITY_COLLECTIONS[type]);
    if (type === 'condition') return col.findOne({ $or: [{ id: { $eq: id } }, { code: { $eq: id } }] });
    return col.findOne({ id: { $eq: id } });
  }

  /** A provider event names a profile id, a user id or an account id; resolve the profile. */
  async resolveProvider(providerId: string): Promise<{ type: PublicEntityType; entity: Record<string, any> } | null> {
    const p: any = await this.conn.collection('provider_profiles').findOne({
      $or: [{ id: { $eq: providerId } }, { account_id: { $eq: providerId } }, { user_id: { $eq: providerId } }],
    });
    if (p?.type === 'doctor') return { type: 'doctor', entity: p };
    if (p?.type === 'pharmacy') return { type: 'pharmacy', entity: p };
    const f: any = await this.conn.collection('facilities').findOne({ id: { $eq: providerId } });
    return f ? { type: 'facility', entity: f } : null;
  }

  async urlsFor(type: PublicEntityType, entity: Record<string, any>): Promise<string[]> {
    return publicUrlsFor(type, entity, CITY_TYPES.includes(type) ? await this.cities() : []);
  }

  /** Ping the six-locale URLs of one entity. Never throws: indexing is best effort. */
  async notifyEntity(type: PublicEntityType, idOrEntity: string | Record<string, any>, reason: string) {
    try {
      const entity = typeof idOrEntity === 'string' ? await this.load(type, idOrEntity) : idOrEntity;
      if (!entity) return { submitted: 0 };
      const urls = await this.urlsFor(type, entity);
      if (!urls.length) return { submitted: 0 };
      const out = await this.indexNow.submitUrls(urls);
      this.logger.log(`indexnow ${reason} ${type}:${entity.id ?? entity.code} urls=${urls.length} ok=${out.success}`);
      return { submitted: urls.length, ok: out.success };
    } catch (e: any) {
      this.logger.warn(`indexnow ${reason} ${type} failed: ${e?.message}`);
      return { submitted: 0 };
    }
  }

  async notifyProvider(providerId: string, reason: string) {
    try {
      const hit = await this.resolveProvider(providerId);
      return hit ? this.notifyEntity(hit.type, hit.entity, reason) : { submitted: 0 };
    } catch {
      return { submitted: 0 };
    }
  }

  /**
   * Safety net: every 10 minutes, ping the URLs of anything whose updatedAt moved since the last
   * sweep. One worker at a time (a lease in indexnow_state), bounded per type.
   */
  @Cron('*/10 * * * *')
  async sweep(now = new Date()) {
    const state = this.conn.collection('indexnow_state');
    const lease = await state.findOneAndUpdate(
      { _id: 'sweep' as any, $or: [{ lease_until: { $lt: now } }, { lease_until: { $exists: false } }] },
      { $set: { lease_until: new Date(now.getTime() + 9 * 60_000) } },
      { upsert: false, returnDocument: 'before' },
    ).catch(() => null);
    let since: Date;
    if (lease) {
      since = lease.last_run ? new Date(lease.last_run) : new Date(now.getTime() - 10 * 60_000);
    } else {
      // first run ever: create the state; a concurrent worker hits the unique _id and stops
      const created = await state.insertOne({ _id: 'sweep' as any, lease_until: new Date(now.getTime() + 9 * 60_000), last_run: null }).catch(() => null);
      if (!created) return { submitted: 0 };
      since = new Date(now.getTime() - 10 * 60_000);
    }
    let urls: string[] = [];
    for (const type of SWEEP_TYPES) {
      const filter: Record<string, unknown> = { updatedAt: { $gt: since, $lte: now } };
      if (type === 'doctor') filter.type = 'doctor';
      if (type === 'pharmacy') filter.type = 'pharmacy';
      const rows = await this.conn.collection(PUBLIC_ENTITY_COLLECTIONS[type]).find(filter).limit(MAX_SWEEP_PER_TYPE).toArray().catch(() => []);
      for (const r of rows) urls.push(...await this.urlsFor(type, r));
    }
    urls = [...new Set(urls)];
    for (let i = 0; i < urls.length; i += INDEXNOW_BATCH) {
      await this.indexNow.submitUrls(urls.slice(i, i + INDEXNOW_BATCH)).catch(() => null);
    }
    await state.updateOne({ _id: 'sweep' as any }, { $set: { last_run: now, lease_until: new Date(0), last_count: urls.length } }).catch(() => null);
    return { submitted: urls.length };
  }
}
