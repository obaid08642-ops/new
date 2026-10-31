import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { CATALOG_COLLECTIONS } from '../../catalogs/catalog-collections';
import { PROVIDER_OFFERS_COLLECTION, PROVIDER_TYPES, type OfferWhere, type Vertical } from '../../../common/service-offers';
import { ProviderAuditLogRepository } from './repositories/providerauditlog.repository';
import type { ProviderServiceOfferDto } from '../provider-service-offers.dto';

export const OFFER_VERTICALS: readonly Vertical[] = ['lab', 'radiology', 'nursing'];

/** The approved catalogue of each vertical and the field its provider-side listing sits in (the older readers still look there). */
const CATALOGUE: Record<Vertical, { collection: string; visible: Record<string, unknown>; code: (s: any) => string }> = {
  lab: { collection: CATALOG_COLLECTIONS.lab_services, visible: { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved', category: { $ne: 'imaging' }, sample_type: { $ne: 'imaging' } }, code: (s) => s.short_code || s.id },
  radiology: { collection: CATALOG_COLLECTIONS.radiology_services, visible: { active: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' }, code: (s) => s.short_code || s.id },
  nursing: { collection: CATALOG_COLLECTIONS.nursing_services, visible: { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, code: (s) => s.code || s.id },
};

export interface ServiceOfferRow {
  service_id: string; code: string; name_ar: string | null; name_en: string | null; category: string | null; image_url: string | null;
  catalogue_price: number | null; home_visit_supported: boolean;
  offered: boolean; where: OfferWhere | null; insurance: boolean; price: number | null; currency: string;
}

/**
 * The full approved catalogue for a provider, each service with that provider's own options, and the one write that changes them. The choice is stored in
 * `provider_service_offers` (read by the patient lists, filters and detail pages: common/service-offers.ts) and mirrored into the provider-profile list the
 * older readers use (lab `test_categories`, radiology `equipment_list`, nursing `nursing_services`), so booking checks agree with what the patient saw.
 * The service itself is already admin-approved; this is the provider's own price/where/insurance for it, applied at once and written to the provider audit log.
 */
@Injectable()
export class ProviderServiceOffersService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Inject('ProviderAuditLogRepository') private readonly audit: ProviderAuditLogRepository,
  ) {}

  async onModuleInit() {
    try { await this.conn.collection(PROVIDER_OFFERS_COLLECTION).createIndex({ provider_account_id: 1, vertical: 1, service_id: 1 }, { unique: true }); await this.conn.collection(PROVIDER_OFFERS_COLLECTION).createIndex({ vertical: 1, service_id: 1 }); } catch { /* an index that exists already */ }
  }

  private verticalOf(v: string): Vertical {
    if (!(OFFER_VERTICALS as readonly string[]).includes(v)) throw new BadRequestException('vertical_invalid');
    return v as Vertical;
  }

  /** The provider's approved profile of the right type for this vertical (a pharmacy cannot offer scans). */
  private async profileFor(user: any, vertical: Vertical): Promise<any> {
    if (!user?.id) throw new ForbiddenException('provider scope required');
    const profile: any = await this.conn.collection('provider_profiles').findOne({ account_id: user.id }, { projection: { _id: 0, account_id: 1, type: 1, provider_type: 1 } });
    const type = String(profile?.type || profile?.provider_type || '').toLowerCase();
    if (!profile || !PROVIDER_TYPES[vertical].includes(type)) throw new ForbiddenException('provider_type_cannot_offer_this_service_kind');
    return profile;
  }

  async list(user: any, verticalRaw: string, opts: { offered?: boolean; search?: string } = {}): Promise<ServiceOfferRow[]> {
    const vertical = this.verticalOf(verticalRaw);
    await this.profileFor(user, vertical);
    const spec = CATALOGUE[vertical];
    const filter: Record<string, unknown> = { ...spec.visible };
    if (opts.search?.trim()) {
      const re = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = ['name_ar', 'name_en', 'short_code', 'code'].map((f) => ({ [f]: re }));
    }
    const services: any[] = await this.conn.collection(spec.collection).find(filter, { projection: { _id: 0 } }).sort({ popularity: -1, name_ar: 1 }).limit(1000).toArray();
    const mine = new Map<string, any>();
    for (const r of await this.conn.collection(PROVIDER_OFFERS_COLLECTION).find({ provider_account_id: user.id, vertical }, { projection: { _id: 0 } }).toArray()) mine.set(r.service_id, r);
    const rows = services.map((s): ServiceOfferRow => {
      const o = mine.get(s.id);
      return {
        service_id: s.id, code: spec.code(s), name_ar: s.name_ar ?? null, name_en: s.name_en ?? null, category: s.category ?? s.modality ?? null, image_url: s.image_url ?? null,
        catalogue_price: typeof s.price === 'number' && s.price > 0 ? s.price : null, home_visit_supported: s.home_visit_supported === true || s.home_collection_availability === true,
        offered: o?.offered === true, where: o?.offered === true ? (o.where as OfferWhere) : null, insurance: o?.insurance === true, price: typeof o?.price === 'number' ? o.price : null, currency: o?.currency || 'SAR',
      };
    });
    return opts.offered === undefined ? rows : rows.filter((r) => r.offered === opts.offered);
  }

  async set(user: any, verticalRaw: string, serviceId: string, body: ProviderServiceOfferDto): Promise<ServiceOfferRow> {
    const vertical = this.verticalOf(verticalRaw);
    await this.profileFor(user, vertical);
    const spec = CATALOGUE[vertical];
    const svc: any = await this.conn.collection(spec.collection).findOne({ id: serviceId, ...spec.visible }, { projection: { _id: 0 } });
    if (!svc) throw new NotFoundException('service_not_found');
    const coll = this.conn.collection(PROVIDER_OFFERS_COLLECTION);
    const before: any = await coll.findOne({ provider_account_id: user.id, vertical, service_id: serviceId }, { projection: { _id: 0 } });
    const where: OfferWhere = body.offered ? (body.where ?? (vertical === 'nursing' ? 'home' : 'premises')) : (before?.where ?? 'premises');
    const price = body.offered && typeof body.price === 'number' && body.price > 0 ? Math.round(body.price * 100) / 100 : null;
    const next = { provider_account_id: user.id, vertical, service_id: serviceId, offered: body.offered, where, insurance: body.insurance === true, price, currency: 'SAR' };
    await coll.updateOne({ provider_account_id: user.id, vertical, service_id: serviceId }, { $set: { ...next, updatedAt: new Date() }, $setOnInsert: { id: uuid(), createdAt: new Date() } }, { upsert: true });
    await this.mirrorToProfile(user.id, vertical, svc, next);
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'service_offer.changed', target: { collection: PROVIDER_OFFERS_COLLECTION, id: `${vertical}:${serviceId}` }, before: before ? { offered: before.offered, where: before.where, insurance: before.insurance, price: before.price } : null, after: { offered: next.offered, where: next.where, insurance: next.insurance, price: next.price } }).catch(() => undefined);
    return (await this.list(user, vertical)).find((r) => r.service_id === serviceId)!;
  }

  /** Keeps the profile list the booking checks read in line with the choice (a service is listed while it is offered). */
  private async mirrorToProfile(accountId: string, vertical: Vertical, svc: any, o: { offered: boolean; where: OfferWhere; insurance: boolean; price: number | null }) {
    const profiles = this.conn.collection('provider_profiles');
    if (vertical === 'lab') await profiles.updateOne({ account_id: accountId }, o.offered ? { $addToSet: { test_categories: svc.id } } : { $pull: { test_categories: svc.id } } as never);
    else if (vertical === 'radiology') await profiles.updateOne({ account_id: accountId }, o.offered ? { $addToSet: { equipment_list: svc.id } } : { $pull: { equipment_list: svc.id } } as never);
    else {
      await profiles.updateOne({ account_id: accountId }, { $pull: { nursing_services: { key: svc.id } } } as never);
      if (o.offered) await profiles.updateOne({ account_id: accountId }, { $push: { nursing_services: { key: svc.id, name_ar: svc.name_ar ?? svc.id, name_en: svc.name_en ?? undefined, price: o.price ?? 0, home: o.where !== 'premises', premises: o.where !== 'home', insurance: o.insurance } } } as never);
    }
  }

  /** Admin: who offers a service and how, or one provider's choices. Ids and options only. */
  async adminView(vertical: string, q: { service_id?: string; provider_account_id?: string }) {
    const v = this.verticalOf(vertical);
    const filter: Record<string, unknown> = { vertical: v };
    if (q.service_id) filter.service_id = q.service_id;
    if (q.provider_account_id) filter.provider_account_id = q.provider_account_id;
    const rows: any[] = await this.conn.collection(PROVIDER_OFFERS_COLLECTION).find(filter, { projection: { _id: 0, provider_account_id: 1, service_id: 1, offered: 1, where: 1, insurance: 1, price: 1, currency: 1, updatedAt: 1 } }).limit(1000).toArray();
    // Names for the admin page (the rows themselves carry ids only): the catalogue service and the provider's display name.
    const serviceIds = [...new Set(rows.map((r) => r.service_id).filter(Boolean))];
    const providerIds = [...new Set(rows.map((r) => r.provider_account_id).filter(Boolean))];
    const [services, accounts]: any[][] = await Promise.all([
      serviceIds.length ? this.conn.collection(CATALOGUE[v].collection).find({ id: { $in: serviceIds } }, { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1 } }).toArray() : [],
      providerIds.length ? this.conn.collection('provider_accounts').find({ id: { $in: providerIds } }, { projection: { _id: 0, id: 1, display_name_ar: 1, display_name_en: 1 } }).toArray() : [],
    ]);
    const serviceName = new Map<string, any>(services.map((x) => [x.id, x]));
    const providerName = new Map<string, any>(accounts.map((x) => [x.id, x]));
    const items = rows.map((r) => ({
      ...r,
      service_name_ar: serviceName.get(r.service_id)?.name_ar ?? null, service_name_en: serviceName.get(r.service_id)?.name_en ?? null,
      provider_name_ar: providerName.get(r.provider_account_id)?.display_name_ar ?? null, provider_name_en: providerName.get(r.provider_account_id)?.display_name_en ?? null,
    }));
    return { vertical: v, total: items.length, offered: items.filter((r) => r.offered).length, items };
  }
}
