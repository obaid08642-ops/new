import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
import { SearchService } from '../search/search.service';
import { AutoEntitySeoPipelineService, PipelineEntityType } from '../events/auto-entity-seo-pipeline.service';
import { PurgeBus } from '../../common/purge-bus';

/**
 * Issue 1541: everything a provider owns, in one list. A provider is known under several ids (the login user,
 * the provider-app account, the public profile), so every listed field is matched against all of them.
 * Orders, pharmacy orders, appointments, bookings, payments, ledger entries, withdrawals and audit logs are NOT
 * listed: they are shared clinical/financial records and stay for audit.
 */
export const PROVIDER_OWNED_COLLECTIONS: ReadonlyArray<{ name: string; fields: readonly string[] }> = [
  // the public profile and the provider-app sign-in account
  { name: 'provider_profiles', fields: ['id', 'user_id', 'account_id'] },
  { name: 'provider_accounts', fields: ['id', 'user_id'] },
  { name: 'doctors', fields: ['provider_account_id'] },
  // capabilities, catalogue and inventory
  { name: 'provider_capabilities_pharmacy', fields: ['provider_account_id'] },
  { name: 'provider_capabilities_lab', fields: ['provider_account_id'] },
  { name: 'provider_capabilities_radiology', fields: ['provider_account_id'] },
  { name: 'provider_capabilities_doctor_sessions', fields: ['provider_account_id'] },
  { name: 'provider_capabilities_home_care', fields: ['provider_account_id'] },
  { name: 'provider_delivery_zones', fields: ['provider_account_id'] },
  { name: 'pharmacy_inventory', fields: ['pharmacy_id'] },
  { name: 'provider_offerings', fields: ['provider_id'] },
  // slots and availability
  { name: 'provider_schedule_slots', fields: ['provider_account_id'] },
  { name: 'provider_schedules', fields: ['account_id'] },
  { name: 'provider_availability', fields: ['provider_account_id'] },
  { name: 'provideravailability', fields: ['provider_id'] },
  { name: 'doctor_leaves', fields: ['doctor_id'] },
  // pending catalogue/profile/slot revisions and settings
  { name: 'provider_deltas', fields: ['provider_id', 'provider_account_id'] },
  { name: 'provider_settings', fields: ['provider_id'] },
  { name: 'prescription_templates', fields: ['doctor_id'] },
  // onboarding file, staff, sessions, notifications, score
  { name: 'provider_documents', fields: ['account_id'] },
  { name: 'provider_bank_accounts', fields: ['account_id'] },
  { name: 'provider_operators', fields: ['provider_account_id'] },
  { name: 'provider_sessions', fields: ['provider_account_id'] },
  { name: 'provider_notifications', fields: ['provider_account_id'] },
  { name: 'provider_scores', fields: ['provider_account_id'] },
  // uploaded files (also the files the profile points at, see erase) and the public page/sitemap projection
  { name: 'storage_objects', fields: ['owner_account_id'] },
  { name: 'public_catalog_projections', fields: ['entity_id'] },
];

/** Profile fields that hold the provider's images and documents (a URL or a stored file id). */
const MEDIA_FIELDS = ['profile_photo', 'logo', 'clinic_images', 'license_documents', 'images', 'signature_url'];
/** Cache tags of the provider pages and the sitemaps (patient-web fetches, edge, tagged backend responses). */
export const PROVIDER_PURGE_TAGS = ['providers', 'sitemap', 'seo'];
const PIPELINE_TYPES: readonly string[] = ['doctor', 'pharmacy', 'hospital', 'clinic', 'lab', 'radiology', 'nursing'];

/** A stored row as read from MongoDB (provider_profiles, storage_objects...). */
export type ProviderRow = Record<string, unknown> & { _id?: unknown };

export interface ProviderIdentity {
  /** Every id the provider is known by (user, provider account, profile). */
  ids: string[];
  profiles: ProviderRow[];
}

@Injectable()
export class ProviderErasureService {
  private readonly log = new Logger('ProviderErasure');

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Optional() private readonly events?: EventEmitter2,
    @Optional() private readonly search?: SearchService,
    @Optional() private readonly seo?: AutoEntitySeoPipelineService,
    @Optional() private readonly purgeBus?: PurgeBus,
  ) {}

  /** All ids and profiles of the provider behind a user id and/or a profile row. */
  async identify(seed: { userId?: string; profile?: ProviderRow }): Promise<ProviderIdentity> {
    const ids = new Set<string>();
    const add = (v: unknown) => { if (typeof v === 'string' && v) ids.add(v); };
    add(seed.userId);
    const profiles = new Map<string, ProviderRow>();
    const keep = (p: ProviderRow | null | undefined) => {
      if (!p) return;
      profiles.set(String(p._id), p);
      add(p.id); add(p.user_id); add(p.account_id);
    };
    keep(seed.profile);
    const db = this.conn;
    // Two passes: a profile names its account, an account names its user, and the other profile row (the
    // provider module keeps one keyed by account_id only) is found through either.
    for (let pass = 0; pass < 2; pass++) {
      const list = [...ids];
      if (!list.length) break;
      const rows = await db.collection('provider_profiles')
        .find({ $or: [{ id: { $in: list } }, { user_id: { $in: list } }, { account_id: { $in: list } }] }).toArray();
      rows.forEach(keep);
      const accounts = await db.collection('provider_accounts')
        .find({ $or: [{ id: { $in: [...ids] } }, { user_id: { $in: [...ids] } }] }, { projection: { id: 1, user_id: 1 } }).toArray();
      for (const a of accounts) { add(a.id); add(a.user_id); }
    }
    return { ids: [...ids], profiles: [...profiles.values()] };
  }

  /**
   * Deletes the provider's own rows (PROVIDER_OWNED_COLLECTIONS) and files, then its search documents, its public
   * page caches and its sitemap entry. Returns the number of rows deleted per collection.
   */
  async erase(identity: ProviderIdentity): Promise<Record<string, number>> {
    const { ids, profiles } = identity;
    const deleted: Record<string, number> = {};
    if (!ids.length) return deleted;
    const db = this.conn;

    // Files first, while the profile still says which they are: each URL goes to the storage deleter
    // (S3/R2 DeleteObject, Cloudinary destroy), awaited so the deleter still finds the storage row it needs.
    const mediaIds = new Set<string>();
    const urls = new Set<string>();
    for (const p of profiles) {
      for (const f of MEDIA_FIELDS) {
        const value = p?.[f];
        for (const v of Array.isArray(value) ? value : [value]) {
          if (typeof v !== 'string' || !v) continue;
          if (/^https?:\/\//i.test(v)) urls.add(v); else mediaIds.add(v);
        }
      }
    }
    const storageFilter = { $or: [{ owner_account_id: { $in: ids } }, { id: { $in: [...mediaIds] } }] };
    const objects = await db.collection('storage_objects').find(storageFilter, { projection: { external_url: 1 } }).toArray();
    for (const o of objects) if (typeof o?.external_url === 'string' && /^https?:\/\//i.test(o.external_url)) urls.add(o.external_url);
    for (const url of urls) {
      try { await this.events?.emitAsync('storage.delete_by_url', { url }); } catch (e) { this.log.warn(`media delete failed: ${(e as Error).message}`); }
    }

    for (const c of PROVIDER_OWNED_COLLECTIONS) {
      const or: Record<string, unknown>[] = c.fields.map((f) => ({ [f]: { $in: ids } }));
      if (c.name === 'storage_objects' && mediaIds.size) or.push({ id: { $in: [...mediaIds] } });
      const res = await db.collection(c.name).deleteMany({ $or: or });
      deleted[c.name] = res.deletedCount || 0;
    }

    // Search: the change stream also sees the profile delete, but only in the worker process and only with a
    // replica set (the polling fallback never sees a delete), so the documents are removed here as well.
    for (const p of profiles) {
      await this.search?.applyChange('provider_profiles', p._id, null);
    }
    // Public page and sitemap: backend caches of each profile, then every layer tagged with the provider pages.
    for (const p of profiles) {
      const type = String(p?.type || 'doctor');
      const entityId = String(p?.id || p?._id);
      const slug = typeof p?.slug === 'string' && p.slug ? p.slug : undefined;
      if (PIPELINE_TYPES.includes(type)) await this.seo?.invalidateCaches(type as PipelineEntityType, entityId, slug);
    }
    try {
      await this.purgeBus?.purge(PROVIDER_PURGE_TAGS);
    } catch (e) {
      // Redis is purged before the edge layers; a missing edge credential is logged, the deletion stands.
      this.log.error(`provider page purge: ${(e as Error).message}`);
    }
    return deleted;
  }
}
