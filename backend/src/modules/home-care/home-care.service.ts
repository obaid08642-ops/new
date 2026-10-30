import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { catalogueSortSpec } from '../catalogue-ranking/catalogue-ranking';
import { SearchService } from '../search/search.service';
import { NURSING_TYPES, byRelevance, matchedIds } from '../search/catalogue-search';
import { KillSwitchesService } from '../kill-switches/kill-switches.service';
import { Model } from 'mongoose';
import { HomeCareService, HomeCareBooking, NursingBookingState, HomeCareBookingState, NursingVisitReport, CarePlan, MedicalSupplyRequest } from '../../schemas/home-care.schema';
import { pick } from '../../common/sanitize';
import { NAME_PROJECTION, withServiceNames } from '../../common/booking-names';
import { pickAttribution } from '../../common/attribution';

/** P3.3 (F15): writable catalog fields — id/_id/active/governance flags excluded. */
export const HOMECARE_CATALOG_FIELDS = [
  'name_ar', 'name_en', 'description_ar', 'description_en', 'category', 'icon', 'price', 'duration', 'duration_value', 'requires_patient_medication', 'requires_companion', 'cash_availability', 'insurance_availability', 'image_url', 'active', 'popularity', 'booking_mode', 'booking_options',
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
import { resolveBookingChoice } from './booking-mode';
import { reviewUpdate, invalidateCatalogCache } from '../../common/catalog-review';
import { isAdminUser } from '../../common/enums';
import { InsuranceFlowService } from '../insurance-engine/insurance-engine.module';

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
    @Optional() private readonly killSwitches?: KillSwitchesService,
    @Optional() private readonly insurance?: InsuranceFlowService,
    @Optional() private readonly searchEngine?: SearchService,
  ) {}

  async list(opts: { category?: string; search?: string; duration?: string; sort?: string }) {
    const q: any = { active: true };
    if (opts.category && opts.category !== 'all') q.category = opts.category;
    if (opts.duration && opts.duration !== 'all') q.duration = opts.duration;
    // the search box uses the home search's engine (typo tolerance, ar/en synonyms); its own text match is the fallback
    const matched = opts.search ? await matchedIds(this.searchEngine, opts.search, NURSING_TYPES) : null;
    if (opts.search) {
      if (matched) q.id = { $in: matched };
      else {
        const re = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        q.$or = [{ name_ar: re }, { name_en: re }, { tags: re }];
      }
    }
    if (!this.redis?.getWithSWR) return this.svcModel.find(q, { _id: 0, __v: 0 }).sort(catalogueSortSpec(opts.sort)).limit(120);
    const cacheKey = `cache:home-care-services:public:v1:${JSON.stringify(opts)}`;
    return this.redis.getWithSWR(cacheKey, 900, async () => this.svcModel.find(q, { _id: 0, __v: 0 }).sort(catalogueSortSpec(opts.sort)).limit(120));
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
    // Issue 955: the admin kill switch refuses new home-nursing requests before anything is stored.
    await this.killSwitches?.assertOn('nursing_broadcast');
    if (!data.service_id) throw new BadRequestException('service_id required');
    if (!data.scheduled_at) throw new BadRequestException('scheduled_at required');
    const svc = await this.svcModel.findOne({ id: data.service_id, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' });
    if (!svc) throw new NotFoundException('service');
    // The patient picks the nurse (nursing/service-details -> nurse-profile): it must be an approved home-care
    // provider offering this service. The booking lands in that nurse's job queue (provider-jobs, ASSIGNED).
    const isAdmin = ['admin', 'super_admin', 'system'].includes(user?.role);
    const providerId = typeof data.provider_id === 'string' ? data.provider_id : '';
    if (!providerId && !isAdmin) throw new BadRequestException('provider_id_required');
    if (providerId) {
      const nurse = await this.svcModel.db.collection('provider_profiles').findOne({
        account_id: providerId, type: { $in: ['home_care', 'nursing', 'nurse'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved',
        'nursing_services.key': svc.id,
      });
      if (!nurse) throw new BadRequestException('provider_cannot_perform_service');
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
    // booking mode (visit | continuous | programme): the service decides, the choice must be one it offers (booking-mode.ts)
    const choice = resolveBookingChoice(svc as any, data);
    // a catalogue row without a price (its providers set their own) cannot be priced from the catalogue: a clear refusal, not a NaN total
    if (!(typeof svc.price === 'number' && svc.price > 0)) throw new BadRequestException('service_price_not_set');
    const sessions = choice.sessions_count;
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
      booking_mode: choice.booking_mode,
      ...(choice.recurrence ? { recurrence: choice.recurrence } : {}),
      ...(choice.hours !== undefined ? { hours: choice.hours, shift: choice.shift, period: choice.period } : {}),
      // P17-17.5: campaign attribution for the campaign report.
      attribution: pickAttribution(data) ?? undefined,
    });
    this.events.emit('homecare.booking_created', { booking_id: booking.id, patient_id: user.id });
    await this.engine.announceCreated({ kind: 'nursing', entity_id: booking.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { service_id: svc.id, total, sessions } });
    // 19.11 step 2: an insurance visit opens its insurance request now, so the nurse receives it with the patient's
    // company, class and documents and decides it (labs and consultations do the same). A refusal (no saved policy,
    // provider not contracted for the company and class) cancels the visit and tells the patient why.
    if (paymentMethod === 'insurance' && this.insurance && providerId) {
      try {
        const request: any = await this.insurance.createRequest(user, { booking_kind: 'nursing', booking_id: booking.id });
        await this.bkgModel.updateOne({ id: booking.id }, { $set: { insurance_request_id: request.id, insurance_status: 'pending' } });
      } catch (e) {
        await this.bkgModel.updateOne({ id: booking.id }, {
          $set: { state: 'CANCELLED' },
          $push: { state_history: { from: booking.state, to: 'CANCELLED', by_user_id: 'system', at: new Date(), note: 'insurance request refused' } },
        });
        throw e;
      }
    }
    return booking.toObject();
  }

  async mineFor(user: any) {
    const rows = await this.bkgModel.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(80).lean();
    return this.withServiceNames(rows as any[]);
  }

  /** Issue 1832: `service_names` in the six languages, resolved from the catalogue by `service_id` in one query; `service_name_ar/en` stay as stored. */
  withServiceNames(bookings: any[]) {
    return withServiceNames(bookings, (ids) => this.svcModel.find({ id: { $in: ids } }, NAME_PROJECTION).lean());
  }

  async getBooking(id: string, user: any) {
    const b = await this.bkgModel.findOne({ id }, { _id: 0, __v: 0 }).lean();
    if (!b) throw new NotFoundException();
    if (b.patient_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    const [named] = await this.withServiceNames([b]);
    return named;
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
        const priorState = String(b.state);
        const total = Number((b as any).total ?? (b as any).total_price ?? 0);
        b.state_history.push({ from: b.state, to: 'CANCELLED', by_user_id: user.id, at: new Date() });
        b.state = 'CANCELLED' as any;
        await b.save();
        this.events.emit('homecare.booking_cancelled', {
          booking_id: b.id, patient_id: b.patient_id, prior_state: priorState,
          total, payment_method: (b as any).payment_method,
        });
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
    if (!isAdminUser(user)) throw new ForbiddenException();
    const doc = await this.svcModel.create({ ...pick(body, HOMECARE_CATALOG_FIELDS), ...reviewUpdate(body?.medical_review_status, user.id), id: require('uuid').v4() });
    await invalidateCatalogCache(this.redis, 'cache:home-care-services:');
    return doc;
  }

  async updateCatalog(user: any, id: string, body: any) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const updated = await this.svcModel.findOneAndUpdate({ id }, { $set: { ...pick(body, HOMECARE_CATALOG_FIELDS), ...reviewUpdate(body?.medical_review_status, user.id) } }, { new: true });
    if (!updated) throw new NotFoundException();
    await invalidateCatalogCache(this.redis, 'cache:home-care-services:');
    return updated;
  }

  /** Admin catalog editor: every item including unpublished ones (the public list only shows approved). */
  async adminCatalog(user: any) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    return this.svcModel.find({ is_deleted: { $ne: true } }, { _id: 0, __v: 0 }).sort({ medical_review_status: 1, popularity: -1, name_ar: 1 }).limit(1000);
  }

  async slotsForProvider(providerAccountId: string, dateStr: string, duration_minutes = 30) {
    // Validate duration: must be integer between 10 and 120
    const duration = parseInt(String(duration_minutes), 10);
    if (!Number.isInteger(duration) || duration < 10 || duration > 120) {
      throw new BadRequestException('duration must be an integer between 10 and 120 minutes');
    }

    const profile = await this.svcModel.db.collection('provider_profiles').findOne({
      account_id: providerAccountId,
      type: { $in: ['home_care', 'nursing', 'nurse'] },
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
    });
    if (!profile) throw new NotFoundException('provider_not_found');
    // journeys#60: a nurse only works at the patient's home, so the hours given at registration (provider-app
    // NursingRegistration sends them as working_hours) are the home-visit hours; schedule_home wins when it is set.
    type HomeWindow = { day?: unknown; open?: string; close?: string; open_evening?: string; close_evening?: string; closed?: boolean };
    const schedule: HomeWindow[] = Array.isArray(profile.schedule_home) && profile.schedule_home.length ? profile.schedule_home
      : Array.isArray(profile.working_hours) ? profile.working_hours : [];
    if (!schedule.length) {
      return { date: dateStr, slots: [], reason: 'no_schedule' };
    }

    const date = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(date.getTime())) return { date: dateStr, slots: [], reason: 'invalid_date' };

    const dow = date.getUTCDay();
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const fullDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const dayMatches = (d: any) => {
      const v = String(d ?? '').toLowerCase();
      return v === 'all' || v === String(dow) || v === dayKeys[dow] || v === fullDays[dow];
    };

    const windows = schedule.filter((w) => w && !w.closed && dayMatches(w.day)).flatMap((w) => [
      ...(w.open && w.close ? [{ open: w.open, close: w.close }] : []),
      ...(w.open_evening && w.close_evening ? [{ open: w.open_evening, close: w.close_evening }] : []),
    ]);

    if (!windows.length) return { date: dateStr, slots: [], reason: 'closed' };

    const baseDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const slots: { id: string; start: string; end: string; label: string; available: boolean }[] = [];
    const seen = new Set<string>();
    const now = Date.now();

    for (const w of windows) {
      const [oh, om] = w.open.split(':').map(Number);
      const [ch, cm] = w.close.split(':').map(Number);
      const openTs = new Date(baseDate.getTime() + oh * 3600_000 + om * 60_000);
      let closeTs = new Date(baseDate.getTime() + ch * 3600_000 + cm * 60_000);
      if (closeTs.getTime() <= openTs.getTime()) closeTs = new Date(closeTs.getTime() + 24 * 3600_000);
      for (let t = openTs.getTime(); t + duration * 60_000 <= closeTs.getTime(); t += duration * 60_000) {
        const start = new Date(t);
        const end = new Date(t + duration * 60_000);
        if (start.getTime() < now + 15 * 60_000) continue;
        const slotId = start.toISOString();
        if (seen.has(slotId)) continue;
        seen.add(slotId);
        slots.push({ id: slotId, start: slotId, end: end.toISOString(), label: slotId.substring(11, 16), available: true });
      }
    }
    slots.sort((x, y) => x.start.localeCompare(y.start));
    if (slots.length === 0) return { date: dateStr, slots: [], reason: 'no_slots' };

    // Mark booked slots as unavailable
    const startOfDay = new Date(baseDate.getTime());
    const endOfDay = new Date(baseDate.getTime() + 24 * 3600_000);
    const booked = await this.bkgModel.find({
      provider_id: providerAccountId,
      scheduled_at: { $gte: startOfDay, $lt: endOfDay },
      state: { $nin: ['CANCELLED', 'COMPLETED'] },
    }).select({ scheduled_at: 1 }).lean();
    const bookedSet = new Set(booked.map((b: any) => new Date(b.scheduled_at).toISOString()));
    for (const s of slots) {
      if (bookedSet.has(s.start)) s.available = false;
    }
    return { date: dateStr, slots };
  }

  async deleteCatalog(user: any, id: string) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const existing = await this.svcModel.findOne({ id });
    if (!existing) throw new NotFoundException();
    await this.svcModel.updateOne({ id }, { $set: { active: false, is_deleted: true } });
    await invalidateCatalogCache(this.redis, 'cache:home-care-services:');
    return { ok: true };
  }

  /** P6.0: medical-review decision — approve surfaces the item publicly. */
  async approveCatalogItem(user: any, id: string, approve: boolean) {
    if (!isAdminUser(user)) throw new ForbiddenException();
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
    if (!isAdminUser(user)) throw new ForbiddenException();
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

  async createCarePlan(user: any, patientId: string, body: { title: string; description?: string; tasks: string[] }) {
    if (!['admin', 'nurse', 'doctor', 'hospital'].includes(user.role)) throw new ForbiddenException();
    return this.carePlanModel.create({
      id: require('uuid').v4(),
      patient_id: patientId,
      doctor_id: hasEffectiveRole(user, 'doctor') ? user.id : undefined,
      nurse_id: hasEffectiveRole(user, 'nurse', 'nursing', 'home_care') ? user.id : undefined,
      title: body.title,
      description: body.description,
      tasks: body.tasks || [],
      status: 'active'
    });
  }

  async getCarePlans(patientId: string) {
    return this.carePlanModel.find({ patient_id: patientId }).sort({ createdAt: -1 }).lean();
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
