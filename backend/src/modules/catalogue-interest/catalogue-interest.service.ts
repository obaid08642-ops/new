import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { loadOffers, summarize, type Vertical } from '../../common/service-offers';
import { NotificationType } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import type { InterestServiceType } from './catalogue-interest.dto';

export const INTEREST_COLLECTION = 'service_interests';

/** Where each vertical's catalogue lives and which flags make a row visible to patients (the same rule as the public lists). */
const CATALOGUE: Record<InterestServiceType, { collection: string; visible: Record<string, unknown>; route: (id: string) => string }> = {
  lab: { collection: CATALOG_COLLECTIONS.lab_services, visible: { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, route: (id) => `/diagnostics/labs/${id}` },
  radiology: { collection: CATALOG_COLLECTIONS.radiology_services, visible: { active: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' }, route: (id) => `/diagnostics/radiology/${id}` },
  nursing: { collection: CATALOG_COLLECTIONS.nursing_services, visible: { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, route: (id) => `/nursing/service-info?id=${id}` },
};

export interface InterestRow { id: string; service_type: InterestServiceType; service_id: string; user_id: string; created_at: Date; notified_at?: Date | null }

/**
 * "Notify me when available" (owner, 2026-10-28): a patient who opens a catalogue service no provider offers yet leaves an interest on it. The interest is
 * stored once per patient and service (idempotent), the owner reads the demand per service (`demand`), and when a provider starts to offer the service
 * the hourly sweep tells the patients once (`notified_at`). Nothing else about the patient is kept with it.
 */
@Injectable()
export class CatalogueInterestService {
  private readonly logger = new Logger('CatalogueInterest');
  private running = false;
  constructor(@InjectConnection() private readonly conn: Connection, private readonly notifications: NotificationsService) {}

  private coll() { return this.conn.collection(INTEREST_COLLECTION); }

  async onModuleInit() {
    try { await this.coll().createIndex({ service_type: 1, service_id: 1, user_id: 1 }, { unique: true }); await this.coll().createIndex({ user_id: 1 }); }
    catch (err) { this.logger.warn(`interest indexes not created: ${String((err as Error)?.message || err).slice(0, 120)}`); }
  }

  private async service(type: InterestServiceType, id: string) {
    const spec = CATALOGUE[type];
    const row = await this.conn.collection(spec.collection).findOne({ id, ...spec.visible }, { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1, short_code: 1, code: 1, category: 1, modality: 1, body_part: 1 } });
    if (!row) throw new NotFoundException('service_not_found');
    return row as any;
  }

  /** Idempotent: asking twice leaves one interest. Answers whether the service has providers now (the client can then offer to book instead). */
  async add(userId: string, type: InterestServiceType, serviceId: string) {
    const svc = await this.service(type, serviceId);
    await this.coll().updateOne({ service_type: type, service_id: serviceId, user_id: userId }, { $setOnInsert: { id: uuid(), service_type: type, service_id: serviceId, user_id: userId, created_at: new Date(), notified_at: null } }, { upsert: true });
    const offers = (await loadOffers(this.conn.db as never, type as Vertical, [svc])).get(svc.id) ?? [];
    return { ok: true, interested: true, ...summarize(offers) };
  }

  async remove(userId: string, type: InterestServiceType, serviceId: string) {
    const r = await this.coll().deleteOne({ service_type: type, service_id: serviceId, user_id: userId });
    return { ok: true, interested: false, removed: (r.deletedCount ?? 0) > 0 };
  }

  async mine(userId: string): Promise<Array<Record<string, unknown>>> {
    const rows = await this.coll().find({ user_id: userId }, { projection: { _id: 0, service_type: 1, service_id: 1, created_at: 1, notified_at: 1 } }).sort({ created_at: -1 }).toArray();
    return rows as Array<Record<string, unknown>>;
  }

  /** Admin: the demand per service, biggest first (counts and the service's names; never who asked). */
  async demand(type?: InterestServiceType) {
    const match = type ? { service_type: type } : {};
    const groups = await this.coll().aggregate([{ $match: match }, { $group: { _id: { t: '$service_type', s: '$service_id' }, interested: { $sum: 1 }, waiting: { $sum: { $cond: [{ $ifNull: ['$notified_at', false] }, 0, 1] } }, last_at: { $max: '$created_at' } } }, { $sort: { interested: -1, '_id.s': 1 } }, { $limit: 500 }]).toArray();
    const out: Array<Record<string, unknown>> = [];
    for (const g of groups) {
      const spec = CATALOGUE[g._id.t as InterestServiceType];
      const svc: any = spec ? await this.conn.collection(spec.collection).findOne({ id: g._id.s }, { projection: { _id: 0, name_ar: 1, name_en: 1 } }) : null;
      out.push({ service_type: g._id.t, service_id: g._id.s, name_ar: svc?.name_ar ?? null, name_en: svc?.name_en ?? null, interested: g.interested, still_waiting: g.waiting, last_interest_at: g.last_at });
    }
    return out;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSweep() {
    if (this.running) return;
    this.running = true;
    try { await this.sweep(); } catch (err) { this.logger.error(`interest sweep failed: ${String((err as Error)?.message || err).slice(0, 160)}`); } finally { this.running = false; }
  }

  /** Tells each waiting patient once when the service they asked for has a provider. Returns the number of notifications sent. */
  async sweep(): Promise<number> {
    const waiting = await this.coll().find({ notified_at: null }, { projection: { _id: 1, service_type: 1, service_id: 1, user_id: 1 } }).limit(5000).toArray();
    let sent = 0;
    const byType = new Map<InterestServiceType, Map<string, any[]>>();
    for (const w of waiting) {
      const m = byType.get(w.service_type) ?? new Map<string, any[]>();
      m.set(w.service_id, [...(m.get(w.service_id) ?? []), w]);
      byType.set(w.service_type, m);
    }
    for (const [type, services] of byType) {
      const rows = (await Promise.all([...services.keys()].map((id) => this.conn.collection(CATALOGUE[type].collection).findOne({ id, ...CATALOGUE[type].visible }, { projection: { _id: 0 } })))).filter(Boolean) as any[];
      const offers = await loadOffers(this.conn.db as never, type as Vertical, rows);
      for (const svc of rows) {
        if (!(offers.get(svc.id) ?? []).length) continue;
        for (const w of services.get(svc.id) ?? []) {
          try {
            await this.notifications.create({ user_id: w.user_id, type: NotificationType.INFO, title_key: 'notif.service_available.title', body_key: 'notif.service_available.body', params: { name: svc.name_ar || svc.name_en || '' }, action: { route: CATALOGUE[type].route(svc.id) } });
            await this.coll().updateOne({ _id: w._id, notified_at: null }, { $set: { notified_at: new Date() } });
            sent += 1;
          } catch (err) { this.logger.warn(`availability notification not sent: ${String((err as Error)?.message || err).slice(0, 120)}`); }
        }
      }
    }
    return sent;
  }
}
