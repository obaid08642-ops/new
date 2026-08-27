import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LabService, LabBooking, LabBookingState, LAB_BOOKING_TRANSITIONS, LabSample } from '../../schemas/lab.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { LabPdfService } from './lab-pdf.service';
import { LabServiceRepository } from "./repositories/labservice.repository";
import { LabBookingRepository } from "./repositories/labbooking.repository";
import { LabSampleRepository } from "./repositories/labsample.repository";
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { getEffectiveRoles } from '../../common/auth.guard';
import { InsuranceFlowService } from '../insurance-engine/insurance-engine.module';

@Injectable()
export class LabsService {
  constructor(
    @Inject('LabServiceRepository') private readonly svcModel: LabServiceRepository,
    @Inject('LabBookingRepository') private readonly bkgModel: LabBookingRepository,
    @Inject('LabSampleRepository') private readonly sampleModel: LabSampleRepository,
    @InjectModel(ProviderProfile.name) private readonly providerProfiles: Model<ProviderProfileDocument>,
    private readonly events: EventEmitter2,
    private readonly bus: EventBusService,
    private readonly engine: WorkflowEngineService,
    private readonly pdfService: LabPdfService,
    private readonly insurance: InsuranceFlowService,
  ) {}

  async list(opts: { category?: string; search?: string; home_only?: boolean; packages_only?: boolean; highest_rated?: boolean; nearest?: boolean; lowest_price?: boolean }) {
    const q: any = { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' };
    if (opts.category) q.category = opts.category;
    if (opts.home_only) q.home_visit_supported = true;
    if (opts.packages_only) q.is_package = true;
    // Explicitly exclude any imaging entries — those belong to the separate Radiology module.
    q.$and = [{ category: { $ne: 'imaging' } }, { sample_type: { $ne: 'imaging' } }];
    if (opts.search) {
      const re = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name_ar: re }, { name_en: re }, { short_code: re }];
    }
    
    let sortObj: any = { popularity: -1, name_ar: 1 };
    if (opts.highest_rated) sortObj = { rating: -1, popularity: -1 };
    else if (opts.lowest_price) sortObj = { price: 1, popularity: -1 };

    return this.svcModel.find(q, { _id: 0, __v: 0 }).sort(sortObj).limit(120);
  }

  async categoryCounts() {
    const agg = await this.svcModel.aggregate([
      { $match: { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved', is_package: false, category: { $ne: 'imaging' }, sample_type: { $ne: 'imaging' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, slug: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    return agg;
  }

  async getById(id: string) {
    const s = await this.svcModel.findOne({ id, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, __v: 0 });
    if (!s) throw new NotFoundException();
    return s;
  }

  async compatibleProviders(testIds: string[]) {
    const ids = [...new Set((testIds || []).filter(Boolean))];
    if (!ids.length) return [];
    const services = await this.svcModel.find({ id: { $in: ids }, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, category: 1 });
    if (services.length !== ids.length) return [];
    const categories = [...new Set(services.map((service: any) => service.category).filter(Boolean))];
    const profiles = await this.providerProfiles.find({
      type: { $in: ['lab', 'hospital'] },
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
      account_id: { $exists: true, $ne: null },
      ...(categories.length ? { test_categories: { $all: categories } } : {}),
    }, { _id: 0, account_id: 1, id: 1, name_ar: 1, name_en: 1, home_visit_supported: 1, rating_avg: 1, rating_count: 1, logo: 1 }).limit(50).lean();
    return profiles.map((profile: any) => ({
      id: profile.account_id,
      facility_id: profile.id,
      name: profile.name_ar || profile.name_en,
      homeVisitAvailable: Boolean(profile.home_visit_supported),
      rating: profile.rating_count > 0 ? profile.rating_avg : null,
      logo: profile.logo || null,
    }));
  }

  async book(user: any, data: any) {
    if (!Array.isArray(data.items) || !data.items.length) throw new BadRequestException('items required');
    if (!data.scheduled_at) throw new BadRequestException('scheduled_at required');
    const services = await this.svcModel.find({ id: { $in: data.items.map((x: any) => x.service_id) } });
    if (!services.length) throw new BadRequestException('no_valid_services');
    const paymentMethod = ['cash', 'card', 'insurance'].includes(data.payment_method) ? data.payment_method : 'cash';
    // Normalize location_type: schema enum is home|facility — accept clinic aliases
    if (['in_clinic', 'clinic', 'lab', 'center'].includes(data.location_type)) data.location_type = 'facility';
    if (!['home', 'facility'].includes(data.location_type)) data.location_type = 'home';
    // Enforce Nabd payment policy
    const svcCtx = data.location_type === 'home' ? 'home_visit' : 'in_clinic';
    const pmAllowed: Record<string, string[]> = {
      home_visit: ['card', 'insurance'],
      in_clinic: ['cash', 'card', 'insurance'],
    };
    if (!pmAllowed[svcCtx]?.includes(paymentMethod)) {
      throw new BadRequestException(`payment_method_${paymentMethod}_not_allowed_for_${svcCtx}`);
    }
    // Phase Stabilization: explicit provider selection is mandatory for patient bookings.
    // Admin/system roles may create without provider_account_id (e.g. seeding, manual ops).
    if (!data.provider_account_id && user.role !== 'admin' && user.role !== 'system') {
      throw new BadRequestException('provider_account_id_required');
    }
    const documents: any[] = Array.isArray(data.documents) ? data.documents.map((d: any) => ({ ...d, uploaded_at: new Date() })) : [];
    // Home rule: insurance + home requires uploaded doctor_request OR preauth
    if (data.location_type === 'home' && paymentMethod === 'insurance') {
      const hasProof = documents.some(d => d.kind === 'doctor_request' || d.kind === 'preauth');
      if (!hasProof) throw new BadRequestException('insurance_home_requires_doctor_request_or_preauth');
    }
    // Home visit support check
    if (data.location_type === 'home' && services.some((s: any) => !s.home_visit_supported)) {
      throw new BadRequestException('some_services_not_home_eligible');
    }
    // Slot collision protection: prevent booking past slots + enforce per-slot capacity
    const slotTime = new Date(data.scheduled_at);
    if (slotTime.getTime() < Date.now() - 5 * 60_000) {
      throw new BadRequestException('slot_expired');
    }
    if (data.provider_account_id) {
      const slotWindow = 30 * 60_000; // 30-minute window for collision check
      const overlapping = await this.bkgModel.countDocuments({
        provider_account_id: data.provider_account_id,
        scheduled_at: { $gte: new Date(slotTime.getTime() - slotWindow), $lt: new Date(slotTime.getTime() + slotWindow) },
        state: { $nin: [LabBookingState.CANCELLED, LabBookingState.REPORTED] },
      });
      // Default max-per-slot=1 unless provider schedule says more; soft cap at 3 for safety
      if (overlapping >= 3) throw new BadRequestException('slot_taken');
    }
    const items = services.map((s: any) => ({ service_id: s.id, name_ar: s.name_ar, name_en: s.name_en, price: s.price, sample_type: s.sample_type, fasting_required: s.fasting_required }));
    // S4 duplicate-booking prevention: a retried/double-tapped submit by the same patient
    // for the same service set within 3 minutes returns the ORIGINAL booking (idempotent)
    // instead of creating a second one.
    const dupWindow = new Date(Date.now() - 3 * 60_000);
    const svcIds = data.items.map((x: any) => x.service_id).sort();
    const recent = await this.bkgModel.find({
      patient_id: user.id,
      createdAt: { $gte: dupWindow },
      state: { $nin: [LabBookingState.CANCELLED, LabBookingState.REPORTED] },
    }).lean();
    const dupe = recent.find((b: any) => JSON.stringify((b.items || []).map((i: any) => i.service_id).sort()) === JSON.stringify(svcIds));
    if (dupe) return dupe;
    const total = items.reduce((sum, i) => sum + (i.price || 0), 0) + (data.location_type === 'home' ? 25 : 0);
    const insurance_status = paymentMethod === 'insurance' ? 'pending' : 'none';
    const booking = await this.bkgModel.create({
      patient_id: user.id,
      patient_name: data.contact?.name || user.full_name,
      patient_phone: data.contact?.phone || user.phone,
      items,
      total,
      location_type: data.location_type || 'facility',
      facility_id: data.facility_id,
      provider_account_id: data.provider_account_id,
      address: data.address,
      scheduled_at: new Date(data.scheduled_at),
      state: LabBookingState.NEW_REQUEST,
      state_history: [{ from: '', to: LabBookingState.NEW_REQUEST, by_user_id: user.id, by_role: user.role, at: new Date() }],
      notes: data.notes,
      payment_method: paymentMethod,
      insurance_provider: data.insurance_provider,
      insurance_member_id: data.insurance_member_id,
      insurance_status,
      documents,
    });
    if (paymentMethod === 'insurance') {
      try {
        const request = await this.insurance.createRequest(user, { booking_id: booking.id, booking_kind: 'lab' });
        booking.insurance_request_id = request.id;
        booking.insurance_review_state = request.state;
        await booking.save();
      } catch (reason) {
        await this.bkgModel.deleteOne({ id: booking.id, patient_id: user.id, state: LabBookingState.NEW_REQUEST } as any);
        throw reason;
      }
      this.bus.emit({ type: 'insurance.pending', entity_type: 'lab_booking', entity_id: booking.id, patient_account_id: user.id, reason_code: data.insurance_provider || 'unknown_provider', meta: { docs: documents.length } }).catch(() => null);
    }
    this.events.emit('lab.booking_created', { booking_id: booking.id, patient_id: user.id, tracking_id: booking.tracking_id });
    this.events.emit('lab.booking_state_changed', { booking_id: booking.id, patient_id: user.id, state: booking.state, tracking_id: booking.tracking_id });
    await this.engine.announceCreated({ kind: 'lab', entity_id: booking.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { tracking_id: booking.tracking_id, items: items.length, total, location_type: booking.location_type, payment_method: paymentMethod } });
    if (booking.location_type === 'home') {
      this.bus.emit({ type: 'home_visit.assigned', entity_type: 'lab_booking', entity_id: booking.id, patient_account_id: user.id, meta: { facility_id: booking.facility_id } }).catch(() => null);
    }
    return booking.toObject();
  }

  async addDocument(id: string, user: any, body: { kind: string; url_or_b64: string; filename?: string }) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (b.patient_id !== user.id && user.role !== 'admin') throw new ForbiddenException();
    b.documents.push({ kind: body.kind as any, url_or_b64: body.url_or_b64, filename: body.filename, uploaded_at: new Date() });
    await b.save();
    this.bus.emit({ type: 'booking.document_uploaded', entity_type: 'lab_booking', entity_id: b.id, actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, meta: { kind: body.kind } }).catch(() => null);
    return b.toObject();
  }

  async updateInsuranceApproval(id: string, payload: { status?: string; totalCopay?: number; items?: any[] }, user: any) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();

    const { status, totalCopay, items } = payload;
    
    if (status) {
      b.insurance_status = status;
    }
    if (totalCopay !== undefined) {
      b.insurance_copay = totalCopay;
    }
    if (items && Array.isArray(items)) {
      for (const itemPayload of items) {
        const item = b.items.find((i: any) => i.service_id === itemPayload.service_id);
        if (item) {
          if (itemPayload.isCovered !== undefined) (item as any).isCovered = itemPayload.isCovered;
          if (itemPayload.rejectReason !== undefined) (item as any).rejectReason = itemPayload.rejectReason;
          if (itemPayload.cashPrice !== undefined) (item as any).cashPrice = itemPayload.cashPrice;
        }
      }
      b.markModified('items');
    }
    
    await b.save();
    if (status) {
      this.bus.emit({ type: status === 'approved' || status === 'partial_approval' ? 'insurance.approved' : 'insurance.rejected', entity_type: 'lab_booking', entity_id: b.id, actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id }).catch(() => null);
    }
    return b.toObject();
  }

  async optInCash(id: string, serviceId: string, payload: { optInCash?: boolean }, user: any) {
    const b = await this.bkgModel.findOne({ id, patient_id: user.id });
    if (!b) throw new NotFoundException('Booking not found');

    const item = b.items.find((i: any) => i.service_id === serviceId);
    if (!item) throw new NotFoundException('Item not found');

    (item as any).optInCash = payload.optInCash ?? true;
    b.markModified('items');
    
    await b.save();
    return b.toObject();
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
    if ([LabBookingState.REPORTED, LabBookingState.CANCELLED].includes(b.state)) return b.toObject();
    return await this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: LabBookingState.CANCELLED,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'user_cancelled',
      mutate: async () => {
        b.state_history.push({ from: b.state, to: LabBookingState.CANCELLED, by_user_id: user.id, by_role: user.role, at: new Date() });
        b.state = LabBookingState.CANCELLED;
        await b.save();
        this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: b.state, tracking_id: b.tracking_id });
        this.events.emit('lab.booking_cancelled', { booking_id: b.id, patient_id: b.patient_id });
        return b.toObject();
      },
    });
  }

  /** Provider/Admin only — transition lab booking through lifecycle. */
  async transition(id: string, to: LabBookingState, user: any, note?: string) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException('admin/lab only');
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    const allowed = LAB_BOOKING_TRANSITIONS[b.state] || [];
    if (!allowed.includes(to)) throw new BadRequestException(`invalid transition ${b.state} → ${to}`);
    return await this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: to,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: note,
      mutate: async () => {
        b.state_history.push({ from: b.state, to, by_user_id: user.id, by_role: user.role, at: new Date(), note });
        b.state = to;
        await b.save();
        this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: to, tracking_id: b.tracking_id });
        return b.toObject();
      },
    });
  }

  /** Provider/Admin list bookings for inbox. */
  async listForProvider(user: any, status?: string) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const q: any = {};
    if (user.role !== 'admin') q.provider_account_id = user.id;
    if (status) q.state = status;
    return this.bkgModel.find(q, { _id: 0, __v: 0 }).sort({ scheduled_at: 1 }).limit(200);
  }

  /** Provider: assign technician to a booking. */
  async assignTechnician(id: string, user: any, body: { technician_id?: string; technician_name?: string; notes?: string }) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id) throw new ForbiddenException();
    b.technician_id = body.technician_id || user.id;
    if (body.notes) b.notes = body.notes;
    await b.save();
    this.events.emit('lab.technician_assigned', { booking_id: b.id, patient_id: b.patient_id, technician_id: b.technician_id });
    return b.toObject();
  }

  /** Provider: upload final report (base64 PDF/image) or JSON structured data. Pushes to reports[] and transitions to REPORTED. */
  async uploadReport(id: string, user: any, body: { name?: string; mime?: string; base64?: string; url?: string; notes?: string; structuredData?: any[] }) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id) throw new ForbiddenException();
    if (!body?.base64 && !body?.url && !body?.structuredData) throw new BadRequestException('report_file_required');
    // State machine: a report can only be uploaded once the sample is in the lab pipeline —
    // never on a fresh/cancelled booking (resurrecting terminal bookings corrupts the lifecycle).
    const reportable = [LabBookingState.RESULT_UPLOADED, LabBookingState.REPORTED];
    if (!reportable.includes(b.state)) {
      throw new BadRequestException(`invalid_transition_${b.state}_to_REPORTED`);
    }
    
    let base64Data = body.base64;
    let mimeType = body.mime || 'application/pdf';
    
    if (body.structuredData && body.structuredData.length > 0) {
      base64Data = await this.pdfService.generateReport(b, body.structuredData);
      base64Data = base64Data.split(',')[1]; // remove data uri prefix
      mimeType = 'application/pdf';
    }

    const report = {
      id: require('uuid').v4(),
      name: body.name || `report_${new Date().toISOString().slice(0,10)}.pdf`,
      mime: mimeType,
      base64: base64Data,
      url: body.url,
      notes: body.notes,
      uploaded_at: new Date(),
      uploaded_by: user.id,
    };
    const persist = async () => {
      (b.reports as any[]).push(report);
      if (b.state !== LabBookingState.REPORTED) {
        b.state_history.push({ from: b.state, to: LabBookingState.REPORTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'report_uploaded' });
        b.state = LabBookingState.REPORTED;
      }
      await b.save();
      this.events.emit('lab.report_uploaded', { booking_id: b.id, patient_id: b.patient_id, report_id: report.id, name: report.name });
      return b.toObject();
    };
    if (b.state === LabBookingState.REPORTED) return persist();
    return this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: LabBookingState.REPORTED,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'report_uploaded', mutate: persist,
    });
  }

  /** Admin list ALL bookings (any provider). */
  async adminListAll(filter: { status?: string; insurance_status?: string; location_type?: string; delayed_only?: string; disputed_only?: string; limit?: number }) {
    const q: any = {};
    if (filter.status) q.state = filter.status;
    if (filter.insurance_status) q.insurance_status = filter.insurance_status;
    if (filter.location_type) q.location_type = filter.location_type;
    
    if (filter.delayed_only === 'true') {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - 24); // Assuming default SLA 24h for general delay if not computed per test
      q.createdAt = { $lt: hoursAgo };
      q.state = { $nin: [LabBookingState.REPORTED, LabBookingState.CANCELLED] };
    }
    
    return this.bkgModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(Math.min(filter.limit || 200, 500));
  }

  async registerSample(user: any, body: { lab_order_id: string; barcode: string; tests: string[]; notes?: string }) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id: body.lab_order_id });
    if (!b) throw new NotFoundException('lab_order_not_found');
    this.assertBookingOwner(user, b);

    const existing = await this.sampleModel.findOne({ barcode: body.barcode });
    if (existing) throw new BadRequestException('barcode_already_registered');

    const persist = async () => {
      const sample = await this.sampleModel.create({
        id: require('uuid').v4(), lab_order_id: body.lab_order_id, patient_id: b.patient_id,
        barcode: body.barcode, tests: body.tests || [], stage: 'received', assigned_to: user.id, notes: body.notes,
      });
      if (b.state !== LabBookingState.SAMPLE_COLLECTED) {
        b.state_history.push({ from: b.state, to: LabBookingState.SAMPLE_COLLECTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'sample_registered' });
        b.state = LabBookingState.SAMPLE_COLLECTED;
        await b.save();
      }
      return sample;
    };
    if (b.state === LabBookingState.SAMPLE_COLLECTED) return persist();
    if (![LabBookingState.CONFIRMED, LabBookingState.IN_TRANSIT, LabBookingState.IN_LAB].includes(b.state)) {
      throw new BadRequestException(`invalid_transition_${b.state}_to_SAMPLE_COLLECTED`);
    }
    return this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: LabBookingState.SAMPLE_COLLECTED,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'sample_registered', mutate: persist,
    });
  }

  async updateSampleStage(user: any, sampleId: string, stage: 'received' | 'analyzing' | 'result_ready' | 'sent', notes?: string) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const sample = await this.sampleModel.findOne({ id: sampleId });
    if (!sample) throw new NotFoundException('sample_not_found');

    const b = await this.bkgModel.findOne({ id: sample.lab_order_id });
    if (!b) throw new NotFoundException('lab_order_not_found');
    this.assertBookingOwner(user, b);
    const allowedSampleStages: Record<string, string[]> = {
      received: ['analyzing'], analyzing: ['result_ready'], result_ready: ['sent'], sent: [],
    };
    if (sample.stage !== stage && !(allowedSampleStages[sample.stage] || []).includes(stage)) {
      throw new BadRequestException(`invalid_sample_transition_${sample.stage}_to_${stage}`);
    }
    const targetBookingState = stage === 'analyzing' ? LabBookingState.PROCESSING
      : stage === 'result_ready' ? LabBookingState.RESULT_UPLOADED : null;
    if (stage === 'sent' && b.state !== LabBookingState.REPORTED) throw new BadRequestException('sample_cannot_be_sent_before_reported');
    const persist = async () => {
      await this.sampleModel.updateOne({ id: sampleId }, { $set: { stage, notes } });
      if (targetBookingState && b.state !== targetBookingState) {
        b.state_history.push({ from: b.state, to: targetBookingState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `sample_stage_${stage}` });
        b.state = targetBookingState;
        await b.save();
      }
      return { ok: true, stage };
    };
    if (!targetBookingState || b.state === targetBookingState) return persist();
    const allowed = (LAB_BOOKING_TRANSITIONS as any)[b.state] || [];
    if (!allowed.includes(targetBookingState)) throw new BadRequestException(`invalid_transition_${b.state}_to_${targetBookingState}`);
    return this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: targetBookingState,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: `sample_stage_${stage}`, mutate: persist,
    });
  }

  async listSamples(user: any) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    if (getEffectiveRoles(user).includes('admin')) return this.sampleModel.find({}).sort({ createdAt: -1 }).lean();
    const bookings = await this.bkgModel.find({ provider_account_id: user.id }, { id: 1 }).lean();
    const bookingIds = bookings.map((booking: any) => booking.id).filter(Boolean);
    if (!bookingIds.length) return [];
    return this.sampleModel.find({ lab_order_id: { $in: bookingIds } }).sort({ createdAt: -1 }).lean();
  }

  private assertAssignedProviderOrAdmin(user: any, booking: any) {
    if (getEffectiveRoles(user).includes('admin')) return;
    const providerRoles = ['lab', 'hospital'];
    if (providerRoles.some(role => getEffectiveRoles(user).includes(role)) && booking.provider_account_id === user.id) return;
    throw new ForbiddenException('lab_booking_not_owned');
  }

  private assertPatientOrAssignedProvider(user: any, booking: any) {
    if (getEffectiveRoles(user).includes('admin')) return;
    if (booking.patient_id === user.id) return;
    this.assertAssignedProviderOrAdmin(user, booking);
  }

  private assertBookingOwner(user: any, booking: any) {
    if (getEffectiveRoles(user).includes('admin')) return;
    if (!booking.provider_account_id || booking.provider_account_id !== user.id) {
      throw new ForbiddenException('lab_booking_not_owned');
    }
  }

  // --- Admin Catalog CRUD ---
  async createCatalog(user: any, body: any) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.svcModel.create({ ...body, id: require('uuid').v4() });
  }

  async updateCatalog(user: any, id: string, body: any) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const updated = await this.svcModel.findOneAndUpdate({ id }, { $set: body }, { new: true });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  async deleteCatalog(user: any, id: string) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const deleted = await this.svcModel.findOneAndDelete({ id });
    if (!deleted) throw new NotFoundException();
    return { ok: true };
  }

  // --- Admin Quality Control & Dispute Intervention ---
  async adminForceState(user: any, id: string, targetState: LabBookingState, note: string) {
    if (user.role !== 'admin') throw new ForbiddenException('admin_only');
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();

    b.state_history.push({ from: b.state, to: targetState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `admin_forced: ${note}` });
    b.state = targetState;
    await b.save();
    return b;
  }

  // --- Addendum Backend Logic ---
  async rescheduleBooking(id: string, user: any, body: any) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Booking not found');
    this.assertPatientOrAssignedProvider(user, b);
    b.scheduled_at = new Date(body.new_date);
    b.reschedule_reason = body.reason;
    b.state_history.push({ from: b.state, to: b.state, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Rescheduled to ${b.scheduled_at}. Reason: ${body.reason}` });
    await b.save();
    return b;
  }

  async updateGps(id: string, user: any, body: any) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Booking not found');
    this.assertAssignedProviderOrAdmin(user, b);
    b.gps_location = {
      lat: body.lat || 0,
      lng: body.lng || 0,
      eta: body.eta || 0,
      distance: body.distance || 0
    };
    await b.save();
    return { ok: true, gps: b.gps_location };
  }

  async getTracking(id: string, user: any) {
    const b = await this.bkgModel.findOne({ id }).lean();
    if (!b) throw new NotFoundException('Booking not found');
    this.assertPatientOrAssignedProvider(user, b);
    
    // Convert history into tracking steps
    const steps = b.state_history.map((h: any) => ({
      title: `State changed to ${h.to}`,
      time: new Date(h.at).toLocaleTimeString(),
      done: true,
      icon: 'check'
    }));

    return {
      eta: b.gps_location?.eta || 0,
      distance: b.gps_location?.distance || 0,
      techName: b.technician_id || 'Unknown',
      steps: steps
    };
  }

  async declareEmergency(id: string, user: any, body: any) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Booking not found');
    this.assertPatientOrAssignedProvider(user, b);
    if ([LabBookingState.REPORTED, LabBookingState.CANCELLED].includes(b.state)) {
      throw new BadRequestException('booking_already_closed');
    }
    b.emergency_reason = body.reason;
    // For emergency, we cancel the appointment or mark it for review
    b.state_history.push({ from: b.state, to: LabBookingState.CANCELLED, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Emergency declared: ${body.reason}` });
    b.state = LabBookingState.CANCELLED;
    await b.save();
    return b;
  }

  /** Provider: cancel current technician assignment and return the booking to the CONFIRMED pool for reassignment. */
  async reassign(id: string, user: any) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Booking not found');
    if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id) throw new ForbiddenException();
    if ([LabBookingState.CANCELLED, LabBookingState.REPORTED].includes(b.state)) {
      throw new BadRequestException('booking_already_closed');
    }
    const prevTech = b.technician_id || null;
    b.technician_id = undefined as any;
    b.state_history.push({ from: b.state, to: LabBookingState.CONFIRMED, by_user_id: user.id, by_role: user.role, at: new Date(), note: `reassigned: technician ${prevTech || 'none'} unassigned, returned to pool` });
    b.state = LabBookingState.CONFIRMED;
    await b.save();
    this.events.emit('lab.booking_reassigned', { booking_id: b.id, patient_id: b.patient_id, previous_technician_id: prevTech });
    return b.toObject();
  }
}
