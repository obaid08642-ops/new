// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { LabService, LabBooking, LabBookingState, LAB_BOOKING_TRANSITIONS, LabSample } from '../../schemas/lab.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { LabPdfService } from './lab-pdf.service';
import { LabServiceRepository } from "./repositories/labservice.repository";
import { LabBookingRepository } from "./repositories/labbooking.repository";
import { LabSampleRepository } from "./repositories/labsample.repository";

@Injectable()
export class LabsService {
  constructor(
    @Inject('LabServiceRepository') private readonly svcModel: LabServiceRepository,
    @Inject('LabBookingRepository') private readonly bkgModel: LabBookingRepository,
    @Inject('LabSampleRepository') private readonly sampleModel: LabSampleRepository,
    private readonly events: EventEmitter2,
    private readonly bus: EventBusService,
    private readonly engine: WorkflowEngineService,
    private readonly pdfService: LabPdfService,
  ) {}

  async list(opts: { category?: string; search?: string; home_only?: boolean; packages_only?: boolean; highest_rated?: boolean; nearest?: boolean; lowest_price?: boolean }) {
    const q: any = { active: true, is_deleted: { $ne: true } };
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
      { $match: { active: true, is_deleted: { $ne: true }, is_package: false, category: { $ne: 'imaging' }, sample_type: { $ne: 'imaging' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, slug: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    return agg;
  }

  async getById(id: string) {
    const s = await this.svcModel.findOne({ id, is_deleted: { $ne: true } }, { _id: 0, __v: 0 });
    if (!s) throw new NotFoundException();
    return s;
  }

  async compatibleProviders(testIds: string[]) {
    // In a real system, we'd check which facility provides which test.
    
    const facilities = await this.svcModel.db.model('Facility').find(
      { type: { $in: ['lab', 'hospital'] }, is_active: true },
      { _id: 0, __v: 0 }
    ).limit(5).lean();

    // If no real facilities exist, provide fallbacks
    if (!facilities || facilities.length === 0) {
      return [];
    }

    
    return facilities.map((f: any, i: number) => ({
      id: f.id,
      name: f.name_ar || f.name_en,
      rating: (4.5 + (i * 0.1)).toFixed(1),
      distance: `${(1.2 + i * 1.5).toFixed(1)} كم`,
      logo: i % 2 === 0 ? 'hospital-building' : 'flask-outline',
      priceMultiplier: 1.0 + (i * 0.05),
      homeVisitAvailable: f.home_visit_enabled || false,
      time: i === 0 ? '١٢ ساعة' : '٢٤ ساعة',
      color: i === 0 ? '#1E88E5' : i === 1 ? '#D32F2F' : '#43A047'
    }));
  }

  async book(user: any, data: any) {
    if (!Array.isArray(data.items) || !data.items.length) throw new BadRequestException('items required');
    if (!data.scheduled_at) throw new BadRequestException('scheduled_at required');
    const services = await this.svcModel.find({ id: { $in: data.items.map((x: any) => x.service_id) } });
    if (!services.length) throw new BadRequestException('no_valid_services');
    const paymentMethod = ['cash', 'card', 'insurance'].includes(data.payment_method) ? data.payment_method : 'cash';
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
      state: LabBookingState.CREATED,
      state_history: [{ from: '', to: LabBookingState.CREATED, by_user_id: user.id, by_role: user.role, at: new Date() }],
      notes: data.notes,
      payment_method: paymentMethod,
      insurance_provider: data.insurance_provider,
      insurance_member_id: data.insurance_member_id,
      insurance_status,
      documents,
    });
    this.events.emit('lab.booking_created', { booking_id: booking.id, patient_id: user.id, tracking_id: booking.tracking_id });
    this.events.emit('lab.booking_state_changed', { booking_id: booking.id, patient_id: user.id, state: booking.state, tracking_id: booking.tracking_id });
    await this.engine.announceCreated({ kind: 'lab', entity_id: booking.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { tracking_id: booking.tracking_id, items: items.length, total, location_type: booking.location_type, payment_method: paymentMethod } });
    if (paymentMethod === 'insurance') {
      this.bus.emit({ type: 'insurance.pending', entity_type: 'lab_booking', entity_id: booking.id, patient_account_id: user.id, reason_code: data.insurance_provider || 'unknown_provider', meta: { docs: documents.length } }).catch(() => null);
    }
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
    if (!['admin', 'lab', 'hospital'].includes(user.role)) throw new ForbiddenException();
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
    if (!['admin', 'lab', 'hospital'].includes(user.role)) throw new ForbiddenException('admin/lab only');
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
    if (!['admin', 'lab', 'hospital'].includes(user.role)) throw new ForbiddenException();
    const q: any = {};
    if (user.role !== 'admin') q.provider_account_id = user.id;
    if (status) q.state = status;
    return this.bkgModel.find(q, { _id: 0, __v: 0 }).sort({ scheduled_at: 1 }).limit(200);
  }

  /** Provider: assign technician to a booking. */
  async assignTechnician(id: string, user: any, body: { technician_id?: string; technician_name?: string; notes?: string }) {
    if (!['admin', 'lab', 'hospital'].includes(user.role)) throw new ForbiddenException();
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
    if (!['admin', 'lab', 'hospital'].includes(user.role)) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id) throw new ForbiddenException();
    if (!body?.base64 && !body?.url && !body?.structuredData) throw new BadRequestException('report_file_required');
    
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
    (b.reports as any[]).push(report);
    if (b.state !== LabBookingState.REPORTED) {
      b.state_history.push({ from: b.state, to: LabBookingState.REPORTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'report_uploaded' });
      b.state = LabBookingState.REPORTED;
    }
    await b.save();
    this.events.emit('lab.report_uploaded', { booking_id: b.id, patient_id: b.patient_id, report_id: report.id, name: report.name });
    return b.toObject();
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
    if (!['admin', 'lab', 'hospital'].includes(user.role)) throw new ForbiddenException();
    const providerAccountId = user.provider_account_id;
    if (user.role !== 'admin' && !providerAccountId) throw new ForbiddenException('provider_context_required');
    const bookingFilter: any = { id: body.lab_order_id };
    if (user.role !== 'admin') bookingFilter.provider_account_id = providerAccountId;
    const b = await this.bkgModel.findOne(bookingFilter);
    if (!b) throw new NotFoundException('lab_order_not_found');

    const existing = await this.sampleModel.findOne({ barcode: body.barcode });
    if (existing) throw new BadRequestException('barcode_already_registered');

    const sample = await this.sampleModel.create({
      id: require('uuid').v4(),
      lab_order_id: body.lab_order_id,
      provider_account_id: b.provider_account_id,
      patient_id: b.patient_id,
      barcode: body.barcode,
      tests: body.tests || [],
      stage: 'received',
      assigned_to: user.id,
      notes: body.notes,
    });

    if (b.state === LabBookingState.CONFIRMED || b.state === LabBookingState.CREATED) {
      b.state_history.push({ from: b.state, to: LabBookingState.SAMPLE_COLLECTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'sample_registered' });
      b.state = LabBookingState.SAMPLE_COLLECTED;
      await b.save();
    }

    return sample;
  }

  async updateSampleStage(user: any, sampleId: string, stage: 'received' | 'analyzing' | 'result_ready' | 'sent', notes?: string) {
    if (!['admin', 'lab', 'hospital'].includes(user.role)) throw new ForbiddenException();
    const providerAccountId = user.provider_account_id;
    if (user.role !== 'admin' && !providerAccountId) throw new ForbiddenException('provider_context_required');
    const sampleFilter: any = { id: sampleId };
    if (user.role !== 'admin') sampleFilter.provider_account_id = providerAccountId;
    const sample = await this.sampleModel.findOne(sampleFilter);
    if (!sample) throw new NotFoundException('sample_not_found');

    const allowedStages: Record<string, string[]> = {
      received: ['analyzing'],
      analyzing: ['result_ready'],
      result_ready: ['sent'],
      sent: [],
    };
    if (sample.stage !== stage && !allowedStages[sample.stage]?.includes(stage)) {
      throw new BadRequestException('invalid_sample_stage_transition');
    }
    if (sample.stage === stage) return { ok: true, stage, idempotent: true };

    await this.sampleModel.updateOne(sampleFilter, { $set: { stage, notes } });

    const bookingFilter: any = { id: sample.lab_order_id };
    if (user.role !== 'admin') bookingFilter.provider_account_id = providerAccountId;
    const b = await this.bkgModel.findOne(bookingFilter);
    if (b) {
      let targetBookingState: LabBookingState | null = null;
      if (stage === 'analyzing') targetBookingState = LabBookingState.PROCESSING;
      else if (stage === 'result_ready') targetBookingState = LabBookingState.RESULT_READY;

      if (targetBookingState && b.state !== targetBookingState) {
        b.state_history.push({ from: b.state, to: targetBookingState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `sample_stage_${stage}` });
        b.state = targetBookingState;
        await b.save();
      }
    }

    return { ok: true, stage };
  }

  async listSamples(user: any) {
    if (!['admin', 'lab', 'hospital'].includes(user.role)) throw new ForbiddenException();
    if (user.role === 'admin') return this.sampleModel.find().sort({ createdAt: -1 }).lean();
    if (!user.provider_account_id) throw new ForbiddenException('provider_context_required');
    return this.sampleModel.find({ provider_account_id: user.provider_account_id }).sort({ createdAt: -1 }).lean();
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
    b.scheduled_at = new Date(body.new_date);
    b.reschedule_reason = body.reason;
    b.state_history.push({ from: b.state, to: b.state, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Rescheduled to ${b.scheduled_at}. Reason: ${body.reason}` });
    await b.save();
    return b;
  }

  async updateGps(id: string, user: any, body: any) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Booking not found');
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
    b.emergency_reason = body.reason;
    // For emergency, we cancel the appointment or mark it for review
    b.state_history.push({ from: b.state, to: LabBookingState.CANCELLED, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Emergency declared: ${body.reason}` });
    b.state = LabBookingState.CANCELLED;
    await b.save();
    return b;
  }
}
