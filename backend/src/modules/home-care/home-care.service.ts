import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { Model } from 'mongoose';
import { HomeCareService, HomeCareBooking, NursingBookingState, HomeCareBookingState, NursingVisitReport, CarePlan, MedicalSupplyRequest } from '../../schemas/home-care.schema';
import { pick } from '../../common/sanitize';

/** P3.3 (F15): writable catalog fields — id/_id/active/governance flags excluded. */
export const HOMECARE_CATALOG_FIELDS = [
  'name_ar', 'name_en', 'description_ar', 'description_en', 'category', 'icon', 'price', 'duration', 'duration_value', 'requires_patient_medication', 'requires_companion', 'cash_availability', 'insurance_availability', 'image_url', 'active', 'popularity',
] as const;
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { HomeCareServiceRepository } from "./repositories/homecareservice.repository";
import { HomeCareBookingRepository } from "./repositories/homecarebooking.repository";
import { NursingVisitReportRepository } from "./repositories/nursingvisitreport.repository";
import { CarePlanRepository } from "./repositories/careplan.repository";
import { MedicalSupplyRequestRepository } from "./repositories/medicalsupplyrequest.repository";
import { RedisService } from '../redis/redis.service';
import { hasEffectiveRole } from '../../common/auth.guard';
import { reviewUpdate, invalidateCatalogCache } from '../../common/catalog-review';
import { getEffectiveRoles } from '../../common/auth.guard';

@Injectable()
export class HomeCareSvc {
  constructor(
    @Inject('HomeCareServiceRepository') private readonly svcModel: HomeCareServiceRepository,
    @Inject('HomeCareBookingRepository') private readonly bkgModel: HomeCareBookingRepository,
    @Inject('NursingVisitReportRepository') private readonly reportModel: NursingVisitReportRepository,
    @Inject('CarePlanRepository') private readonly carePlanModel: CarePlanRepository,
    @Inject('MedicalSupplyRequestRepository') private readonly supplyModel: MedicalSupplyRequestRepository,
    private readonly events: EventEmitter2,
    private readonly engine: WorkflowEngineService,
    private readonly bus: EventBusService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async list(opts: { category?: string; search?: string; duration?: string }) {
    const q: any = { active: true };
    if (opts.category && opts.category !== 'all') q.category = opts.category;
    if (opts.duration && opts.duration !== 'all') q.duration = opts.duration;
    if (opts.search) {
      const re = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name_ar: re }, { name_en: re }, { tags: re }];
    }
    if (!this.redis?.getWithSWR) return this.svcModel.find(q, { _id: 0, __v: 0 }).sort({ popularity: -1, name_ar: 1 }).limit(120);
    const cacheKey = `cache:home-care-services:public:v1:${JSON.stringify(opts)}`;
    return this.redis.getWithSWR(cacheKey, 900, async () => this.svcModel.find(q, { _id: 0, __v: 0 }).sort({ popularity: -1, name_ar: 1 }).limit(120));
  }

  async categoryCounts() {
    return this.svcModel.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, slug: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
  }

  async getById(id: string) {
    const s = await this.svcModel.findOne({ id }, { _id: 0, __v: 0 });
    if (!s) throw new NotFoundException();
    return s;
  }

  async book(user: any, data: any) {
    if (!data.service_id) throw new BadRequestException('service_id required');
    if (!data.scheduled_at) throw new BadRequestException('scheduled_at required');
    const svc = await this.svcModel.findOne({ id: data.service_id, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' });
    if (!svc) throw new NotFoundException('service');
    // The patient picks the nurse (nursing/service-details -> nurse-profile): it must be an approved home-care
    // provider offering this service. The booking lands in that nurse's job queue (provider-jobs, ASSIGNED).
    const isAdmin = ['admin', 'super_admin', 'system'].includes(user?.role);
    const requestedProviderId = typeof data.provider_id === 'string' ? data.provider_id : '';
    if (!requestedProviderId && !isAdmin) throw new BadRequestException('provider_id_required');
    // N7: a patient picks the nurse by the public PROFILE id (the public views no
    // longer publish the account id). Resolve it to the provider account here, so
    // the booking — and the nurse's job queue and accept rule, which key on the
    // account id — are unchanged.
    let providerId = '';
    if (requestedProviderId) {
      const nurse = await this.svcModel.db.collection('provider_profiles').findOne({
        $or: [{ id: { $eq: requestedProviderId } }, { account_id: { $eq: requestedProviderId } }],
        type: { $in: ['home_care', 'nursing', 'nurse'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved',
        'nursing_services.key': svc.id,
      });
      if (!nurse) throw new BadRequestException('provider_cannot_perform_service');
      providerId = String(nurse.account_id || nurse.id || '');
      if (!providerId) throw new BadRequestException('provider_cannot_perform_service');
    }
    const when = new Date(String(data.scheduled_at));
    if (isNaN(when.getTime()) || when.getTime() < Date.now() - 5 * 60_000) throw new BadRequestException('slot_expired');
    // Home visits are paid by card or insurance (same policy as lab/radiology home visits).
    const paymentMethod = String(data.payment_method || 'card');
    if (!['card', 'insurance'].includes(paymentMethod)) throw new BadRequestException(`payment_method_${paymentMethod}_not_allowed_for_home_visit`);
    // S4 duplicate-booking prevention: idempotent replay for double-tap/retry within 3 minutes
    const dupe = await this.bkgModel.findOne({
      patient_id: user.id,
      service_id: data.service_id,
      createdAt: { $gte: new Date(Date.now() - 3 * 60_000) },
      state: { $nin: ['CANCELLED', NursingBookingState.COMPLETED] },
    }).lean();
    if (dupe) return dupe;
    const sessions = Math.max(1, parseInt(data.sessions_count || 1, 10));
    const total = svc.price * sessions;
    const booking = await this.bkgModel.create({
      patient_id: user.id,
      patient_name: data.contact?.name || user.full_name,
      patient_phone: data.contact?.phone || user.phone,
      service_id: svc.id,
      service_name_ar: svc.name_ar,
      service_name_en: svc.name_en,
      duration: svc.duration,
      total,
      address: data.address,
      scheduled_at: when,
      provider_id: providerId || undefined,
      state: providerId ? NursingBookingState.PROVIDER_ASSIGNED : NursingBookingState.NEW_REQUEST,
      state_history: [{ from: '', to: providerId ? NursingBookingState.PROVIDER_ASSIGNED : NursingBookingState.NEW_REQUEST, by_user_id: user.id, at: new Date() }],
      notes: data.notes,
      payment_method: paymentMethod,
      sessions_count: sessions,
    });
    this.events.emit('homecare.booking_created', { booking_id: booking.id, patient_id: user.id });
    await this.engine.announceCreated({ kind: 'nursing', entity_id: booking.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { service_id: svc.id, total, sessions } });
    return booking.toObject();
  }

  async mineFor(user: any) {
    return this.bkgModel.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(80);
  }

  async getBooking(id: string, user: any) {
    const b = await this.bkgModel.findOne({ id }, { _id: 0, __v: 0 });
    if (!b) throw new NotFoundException();
    if (b.patient_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    return b;
  }

  async cancel(id: string, user: any) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (b.patient_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    if ([NursingBookingState.COMPLETED, NursingBookingState.ESCALATED_EMERGENCY].includes(b.state as any)) return b.toObject();
    return await this.engine.apply({
      kind: 'nursing', entity_id: b.id, from_domain: b.state, to_domain: 'CANCELLED',
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'user_cancelled',
      mutate: async () => {
        b.state_history.push({ from: b.state, to: 'CANCELLED', by_user_id: user.id, at: new Date() });
        b.state = 'CANCELLED' as any;
        await b.save();
        this.events.emit('homecare.booking_cancelled', { booking_id: b.id });
        return b.toObject();
      },
    });
  }

  /** Provider/Admin transition. */
  async transition(id: string, to: NursingBookingState, user: any, note?: string) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    return await this.engine.apply({
      kind: 'nursing', entity_id: b.id, from_domain: b.state, to_domain: to,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: note,
      mutate: async () => {
        b.state_history.push({ from: b.state, to, by_user_id: user.id, at: new Date(), note });
        b.state = to;
        await b.save();
        this.events.emit('homecare.booking_state_changed', { booking_id: b.id, state: to });
        return b.toObject();
      },
    });
  }

  // --- Admin Catalog CRUD (nursing/home-care services) ---
  async createCatalog(user: any, body: any) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const doc = await this.svcModel.create({ ...pick(body, HOMECARE_CATALOG_FIELDS), ...reviewUpdate(body?.medical_review_status, user.id), id: require('uuid').v4() });
    await invalidateCatalogCache(this.redis, 'cache:home-care-services:');
    return doc;
  }

  async updateCatalog(user: any, id: string, body: any) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const updated = await this.svcModel.findOneAndUpdate({ id }, { $set: { ...pick(body, HOMECARE_CATALOG_FIELDS), ...reviewUpdate(body?.medical_review_status, user.id) } }, { new: true });
    if (!updated) throw new NotFoundException();
    await invalidateCatalogCache(this.redis, 'cache:home-care-services:');
    return updated;
  }

  /** Admin catalog editor: every item including unpublished ones (the public list only shows approved). */
  async adminCatalog(user: any) {
    if (!getEffectiveRoles(user).includes('admin')) throw new ForbiddenException();
    return this.svcModel.find({ is_deleted: { $ne: true } }, { _id: 0, __v: 0 }).sort({ medical_review_status: 1, popularity: -1, name_ar: 1 }).limit(1000);
  }

  async deleteCatalog(user: any, id: string) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const existing = await this.svcModel.findOne({ id });
    if (!existing) throw new NotFoundException();
    await this.svcModel.updateOne({ id }, { $set: { active: false, is_deleted: true } });
    await invalidateCatalogCache(this.redis, 'cache:home-care-services:');
    return { ok: true };
  }

  /** P6.0: medical-review decision — approve surfaces the item publicly. */
  async approveCatalogItem(user: any, id: string, approve: boolean) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const updated = await this.svcModel.findOneAndUpdate(
      { id: { $eq: id } },
      { $set: reviewUpdate(approve ? 'approved' : 'rejected', user.id) },
      { new: true },
    );
    if (!updated) throw new NotFoundException();
    // Public lists are cached per query: without this an approved item stays hidden until the TTL.
    await invalidateCatalogCache(this.redis, 'cache:home-care-services:');
    await this.bus.emit({ type: approve ? 'catalog.service_approved' : 'catalog.service_disabled', entity_type: 'service', entity_id: id, actor_account_id: user.id, actor_role: 'admin', meta: { kind: 'home_care' }, idempotency_key: `homecare-catalog-approve:${id}:${approve ? 'on' : 'off'}` }).catch(() => null);
    return updated;
  }

  async bulkApproveCatalog(user: any, ids: string[], approve: boolean) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const list = (Array.isArray(ids) ? ids : []).filter((x) => typeof x === 'string' && x).slice(0, 200);
    if (!list.length) throw new BadRequestException('ids_required');
    const results: any[] = [];
    for (const itemId of list) {
      try {
        await this.approveCatalogItem(user, itemId, approve);
        results.push({ id: itemId, ok: true });
      } catch (e: any) {
        results.push({ id: itemId, ok: false, error: e?.message || 'failed' });
      }
    }
    return { ok: true, approve, results };
  }

  async checkIn(user: any, bookingId: string, lat?: number, lng?: number) {    if (!['admin', 'nurse', 'hospital'].includes(user.role)) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id: bookingId });
    if (!b) throw new NotFoundException('booking_not_found');

    // Digital Check-in: transition state to IN_PROGRESS
    await this.transition(bookingId, HomeCareBookingState.IN_PROGRESS, user, 'check_in');

    const report = await this.reportModel.create({
      id: require('uuid').v4(),
      booking_id: bookingId,
      patient_id: b.patient_id,
      nurse_id: user.id,
      check_in_time: new Date(),
      gps_lat: lat,
      gps_lng: lng,
    });

    return report;
  }

  async submitReport(user: any, reportId: string, body: { completed_tasks: string[]; vitals_logged?: any; notes?: string }) {
    if (!['admin', 'nurse', 'hospital'].includes(user.role)) throw new ForbiddenException();
    const report = await this.reportModel.findOne({ id: reportId });
    if (!report) throw new NotFoundException('report_not_found');

    await this.reportModel.updateOne({ id: reportId }, {
      $set: {
        check_out_time: new Date(),
        completed_tasks: body.completed_tasks,
        vitals_logged: body.vitals_logged || {},
        notes: body.notes
      }
    });

    // Complete the booking
    await this.transition(report.booking_id, HomeCareBookingState.COMPLETED, user, 'visit_completed');

    return { ok: true };
  }

  async requestSupplies(user: any, visitReportId: string, items: Array<{ name: string; qty: number; unit: string }>) {
    if (!['admin', 'nurse', 'hospital'].includes(user.role)) throw new ForbiddenException();
    return this.supplyModel.create({
      id: require('uuid').v4(),
      visit_report_id: visitReportId,
      nurse_id: user.id,
      items: items.map(it => ({ ...it, status: 'pending' }))
    });
  }
}
