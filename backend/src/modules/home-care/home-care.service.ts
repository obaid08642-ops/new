// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { HomeCareService, HomeCareBooking, NursingBookingState, NursingVisitReport, CarePlan, MedicalSupplyRequest } from '../../schemas/home-care.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { HomeCareServiceRepository } from "./repositories/homecareservice.repository";
import { HomeCareBookingRepository } from "./repositories/homecarebooking.repository";
import { NursingVisitReportRepository } from "./repositories/nursingvisitreport.repository";
import { CarePlanRepository } from "./repositories/careplan.repository";
import { MedicalSupplyRequestRepository } from "./repositories/medicalsupplyrequest.repository";

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
  ) {}

  async list(opts: { category?: string; search?: string; duration?: string }) {
    const q: any = { active: true };
    if (opts.category && opts.category !== 'all') q.category = opts.category;
    if (opts.duration && opts.duration !== 'all') q.duration = opts.duration;
    if (opts.search) {
      const re = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name_ar: re }, { name_en: re }, { tags: re }];
    }
    return this.svcModel.find(q, { _id: 0, __v: 0 }).sort({ popularity: -1, name_ar: 1 }).limit(120);
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
    const svc = await this.svcModel.findOne({ id: data.service_id });
    if (!svc) throw new NotFoundException('service');
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
      scheduled_at: new Date(data.scheduled_at),
      state: NursingBookingState.NEW_REQUEST,
      state_history: [{ from: '', to: NursingBookingState.NEW_REQUEST, by_user_id: user.id, at: new Date() }],
      notes: data.notes,
      payment_method: data.payment_method || 'cash',
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
  async transition(id: string, to: HomeCareBookingState, user: any, note?: string) {
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

  async checkIn(user: any, bookingId: string, lat?: number, lng?: number) {
    if (!['admin', 'nurse', 'hospital'].includes(user.role)) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id: bookingId });
    if (!b) throw new NotFoundException('booking_not_found');

    // Digital Check-in: transition state to IN_PROGRESS
    await this.transition(bookingId, HomeCareBookingState.IN_PROGRESS, user, 'check_in');

    const report = await this.reportModel.create({
      id: require('uuid').v4(),
      home_care_order_id: bookingId,
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
    await this.transition(report.home_care_order_id, HomeCareBookingState.COMPLETED, user, 'visit_completed');

    return { ok: true };
  }

  async createCarePlan(user: any, patientId: string, body: { title: string; description?: string; tasks: string[] }) {
    if (!['admin', 'nurse', 'doctor', 'hospital'].includes(user.role)) throw new ForbiddenException();
    return this.carePlanModel.create({
      id: require('uuid').v4(),
      patient_id: patientId,
      doctor_id: user.role === 'doctor' ? user.id : undefined,
      nurse_id: user.role === 'nurse' ? user.id : undefined,
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
