import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { recordAudit } from '../../common/audit-record';
import { LedgerService } from '../finance-engine/finance-engine.module';
import { ProviderAdminService } from '../provider/services/provider-admin.service';
import { ProviderNotificationsService } from '../provider/services/provider-notifications.service';
import { ProviderNotificationType } from '../provider/schemas/requests.schema';
import { PRICE_REVIEWS, type PriceReviewAction } from './price-review';

/**
 * Admin side of the price reviews (owner decision 2026-10-25). Every action needs a reason, is recorded on the row (admin_id, action, note,
 * acted_at) and in the audit trail, and works only on an OPEN review, once: the row is claimed first, so two admins cannot both act.
 *  - update the catalogue price to the offered one (audit-logged as the medicine's own `sfda_price_changed`),
 *  - dismiss (the price is justified),
 *  - act on the pharmacy: a warning (a notice in its app), a temporary suspension (until a date), a block, or a penalty (a ledger debit).
 */
@Injectable()
export class PharmacyPriceReviewService {
  private readonly ledger: LedgerService;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly providerAdmin: ProviderAdminService,
    private readonly providerNotifications: ProviderNotificationsService,
  ) {
    this.ledger = new LedgerService(conn);
  }

  private get col() { return this.conn.collection(PRICE_REVIEWS); }

  async list(q: { status?: string; pharmacy_id?: string; min_percent?: string; page?: string; limit?: string }) {
    const filter: Record<string, unknown> = {};
    const status = q.status ?? 'open';
    if (status !== 'all') filter.status = status;
    if (q.pharmacy_id) filter.pharmacy_id = { $eq: String(q.pharmacy_id) };
    const min = Number(q.min_percent);
    if (Number.isFinite(min) && min > 0) filter.percent_above = { $gte: min };
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
    const [rows, total] = await Promise.all([
      this.col.find(filter, { projection: { _id: 0 } }).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      this.col.countDocuments(filter),
    ]);
    return { items: await this.withPharmacyNames(rows), total, page, limit };
  }

  async get(id: string) {
    const row = await this.col.findOne({ id: { $eq: String(id) } }, { projection: { _id: 0 } });
    if (!row) throw new NotFoundException('price_review_not_found');
    const [one] = await this.withPharmacyNames([row]);
    // the same pharmacy and medicine in other reviews: what the admin weighs before acting
    const history = await this.col.find({ pharmacy_id: one.pharmacy_id, medicine_id: one.medicine_id, id: { $ne: one.id } }, { projection: { _id: 0, id: 1, status: 1, action: 1, percent_above: 1, offered_price: 1, created_at: 1 } }).sort({ created_at: -1 }).limit(10).toArray();
    return { ...one, history };
  }

  private async withPharmacyNames(rows: any[]) {
    const ids = [...new Set(rows.map((r) => r.pharmacy_id).filter((v) => typeof v === 'string' && v))];
    const profiles: any[] = ids.length
      ? await this.conn.collection('provider_profiles').find({ account_id: { $in: ids } }, { projection: { _id: 0, account_id: 1, display_name_ar: 1, display_name_en: 1, name_ar: 1, name_en: 1, business_name: 1, legal_name: 1 } }).toArray()
      : [];
    const names = new Map(profiles.map((p) => {
      const registered = p.business_name || p.legal_name || null;
      return [p.account_id, { pharmacy_name_ar: p.display_name_ar || p.name_ar || registered || null, pharmacy_name_en: p.display_name_en || p.name_en || registered || null }];
    }));
    return rows.map((r) => ({ ...r, ...(names.get(r.pharmacy_id) ?? { pharmacy_name_ar: null, pharmacy_name_en: null }) }));
  }

  /** Claims an open review for an admin's decision; 404 when it does not exist, 409 when it was already decided. */
  private async claim(id: string, admin: any, action: PriceReviewAction, status: 'catalogue_updated' | 'pharmacy_actioned' | 'dismissed', note: string, extra: Record<string, unknown> = {}) {
    const now = new Date();
    const res: any = await this.col.findOneAndUpdate(
      { id: { $eq: String(id) }, status: 'open' },
      { $set: { status, action, note: note.trim(), admin_id: admin?.id ?? null, acted_at: now, updated_at: now, ...extra } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    const row = res?.value ?? res;
    if (!row?.id) throw await this.notOpen(id);
    return row;
  }

  /** Why a review cannot be decided now: it does not exist (404) or somebody already decided it (409). */
  private async notOpen(id: string): Promise<Error> {
    const exists = await this.col.countDocuments({ id: { $eq: String(id) } });
    return exists ? new ConflictException('price_review_already_decided') : new NotFoundException('price_review_not_found');
  }

  /** Gives the review back when what the decision needed to do failed, so the admin can try again. */
  private async release(id: string) {
    await this.col.updateOne({ id: { $eq: String(id) } }, { $set: { status: 'open', action: null, note: null, admin_id: null, acted_at: null, updated_at: new Date() } });
  }

  private async audit(admin: any, row: any, action: PriceReviewAction, changes?: Record<string, unknown>) {
    await recordAudit(this.conn, {
      action: `pharmacy.price_review.${action}`, user_id: admin?.id, role: 'admin', resource_kind: 'pharmacy_price_review', resource_id: row.id,
      reason: row.note, severity: action === 'block' || action === 'suspend_temporary' || action === 'penalty' ? 'warn' : 'info',
      details: { pharmacy_id: row.pharmacy_id, medicine_id: row.medicine_id, catalogue_price: row.catalogue_price, offered_price: row.offered_price, percent_above: row.percent_above, ...(changes ?? {}) },
    });
  }

  async updateCatalogue(admin: any, id: string, note: string) {
    const current: any = await this.col.findOne({ id: { $eq: String(id) }, status: 'open' }, { projection: { _id: 0 } });
    if (!current) throw await this.notOpen(id);
    if (!current.medicine_id) throw new BadRequestException('price_review_line_has_no_catalogue_item');
    const med: any = await this.conn.collection('medicines').findOne({ id: { $eq: String(current.medicine_id) }, is_deleted: { $ne: true } }, { projection: { _id: 0, id: 1, sfda_price: 1 } });
    if (!med) throw new NotFoundException('catalogue_item_not_found');
    const next = Number(current.offered_price);
    if (!Number.isFinite(next) || next <= 0) throw new BadRequestException('invalid_offered_price');
    const row = await this.claim(id, admin, 'catalogue_updated', 'catalogue_updated', note);
    try {
      await this.conn.collection('medicines').updateOne({ id: med.id }, { $set: { sfda_price: next, sfda_price_source: `price review ${row.id} by admin ${admin?.id ?? ''}`.trim(), sfda_price_updated_at: new Date() } });
    } catch (e) { await this.release(id); throw e; }
    await recordAudit(this.conn, { action: 'medicine.sfda_price_changed', user_id: admin?.id, role: 'admin', resource_kind: 'medicine', resource_id: med.id, reason: row.note, changes: { before: { sfda_price: med.sfda_price ?? null }, after: { sfda_price: next } }, details: { price_review_id: row.id } });
    await this.audit(admin, row, 'catalogue_updated', { before_sfda_price: med.sfda_price ?? null, after_sfda_price: next });
    return row;
  }

  async dismiss(admin: any, id: string, note: string) {
    const row = await this.claim(id, admin, 'dismissed', 'dismissed', note);
    await this.audit(admin, row, 'dismissed');
    return row;
  }

  private async notifyPharmacy(row: any, titleAr: string, titleEn: string, bodyAr: string, bodyEn: string) {
    await this.providerNotifications.createSystem(row.pharmacy_id, {
      type: ProviderNotificationType.ADMIN_MESSAGE, title_ar: titleAr, title_en: titleEn, body_ar: bodyAr, body_en: bodyEn, related_id: row.id, related_type: 'pharmacy_price_review',
    });
  }

  async warn(admin: any, id: string, note: string) {
    const row = await this.claim(id, admin, 'warning', 'pharmacy_actioned', note);
    try {
      await this.notifyPharmacy(row, 'تحذير بشأن سعر عرض', 'Warning about an offer price',
        `سعر ${row.name_ar || 'صنف'} في عرضك أعلى ${row.percent_above}% من سعر الكتالوج. ${row.note}`,
        `Your price for ${row.name_en || row.name_ar || 'an item'} is ${row.percent_above}% above the catalogue price. ${row.note}`);
    } catch (e) { await this.release(id); throw e; }
    await this.audit(admin, row, 'warning');
    return row;
  }

  async suspend(admin: any, id: string, note: string, until: string) {
    const end = new Date(until);
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) throw new BadRequestException('suspension_end_must_be_in_the_future');
    const row = await this.claim(id, admin, 'suspend_temporary', 'pharmacy_actioned', note, { suspended_until: end });
    try {
      await this.providerAdmin.suspend(admin, row.pharmacy_id, { reason: `price review ${row.id}: ${row.note} (until ${end.toISOString()})` });
    } catch (e) { await this.release(id); throw e; }
    await this.audit(admin, row, 'suspend_temporary', { suspended_until: end.toISOString() });
    return row;
  }

  async block(admin: any, id: string, note: string) {
    const row = await this.claim(id, admin, 'block', 'pharmacy_actioned', note);
    try {
      await this.providerAdmin.suspend(admin, row.pharmacy_id, { reason: `price review ${row.id}: blocked: ${row.note}` });
      await this.conn.collection('provider_profiles').updateMany({ account_id: row.pharmacy_id }, { $set: { blocked_by_price_review: row.id } });
    } catch (e) { await this.release(id); throw e; }
    await this.audit(admin, row, 'block');
    return row;
  }

  async penalty(admin: any, id: string, note: string, amount: number) {
    const row = await this.claim(id, admin, 'penalty', 'pharmacy_actioned', note, { penalty_amount_sar: amount });
    try {
      if (!(await this.ledger.exists('provider_debit', 'price_review', row.id))) {
        await this.ledger.append({
          type: 'provider_debit', amount, provider_account_id: row.pharmacy_id, ref_type: 'price_review', ref_id: row.id, order_id: row.order_id,
          description: `Price review penalty: ${row.note}`, actor_id: admin?.id,
        });
      }
      await this.notifyPharmacy(row, 'غرامة بشأن سعر عرض', 'Penalty for an offer price', `خُصمت ${amount} ر.س بسبب سعر أعلى من الكتالوج. ${row.note}`, `${amount} SAR was deducted for a price above the catalogue. ${row.note}`).catch(() => undefined);
    } catch (e) { await this.release(id); throw e; }
    await this.audit(admin, row, 'penalty', { amount_sar: amount });
    return row;
  }
}
