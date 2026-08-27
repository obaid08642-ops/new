import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MedicalReport, MedicalReportType } from '../../schemas/medical-report.schema';
import { MedicalReportRepository } from "./repositories/medicalreport.repository";

@Injectable()
export class MedicalReportsService {
  constructor(
    @Inject('MedicalReportRepository') private readonly model: MedicalReportRepository,
    private readonly events: EventEmitter2,
  ) {}

  async list(user: any, opts: { type?: string; limit?: number; q?: string }) {
    const filter: any = { patient_id: user.id };
    if (opts.type) filter.report_type = opts.type;
    if (opts.q) {
      const re = new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title_ar: re }, { title_en: re }, { summary: re }, { diagnosis: re }];
    }
    return this.model.find(filter, { _id: 0, __v: 0, body: 0 }).sort({ issued_at: -1, createdAt: -1 }).limit(Math.min(opts.limit || 80, 200));
  }

  async one(user: any, id: string) {
    const r = await this.model.findOne({ id });
    if (!r) throw new NotFoundException();
    if (r.patient_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    if (!r.viewed_by_patient && r.patient_id === user.id) { r.viewed_by_patient = true; r.patient_viewed_at = new Date(); await r.save(); }
    return r.toObject();
  }

  async create(user: any, body: any) {
    if (!['admin', 'doctor', 'hospital', 'radiology', 'lab'].includes(user.role)) throw new ForbiddenException('provider only');
    if (!body.patient_id) throw new BadRequestException('patient_id required');
    if (!body.title_ar) throw new BadRequestException('title_ar required');
    const r = await this.model.create({
      patient_id: body.patient_id,
      patient_name: body.patient_name,
      title_ar: body.title_ar,
      title_en: body.title_en,
      report_type: body.report_type || MedicalReportType.CLINIC_NOTE,
      summary: body.summary,
      body: body.body,
      diagnosis: body.diagnosis,
      recommendations: body.recommendations,
      critical: !!body.critical,
      appointment_id: body.appointment_id,
      prescription_id: body.prescription_id,
      lab_booking_id: body.lab_booking_id,
      radiology_booking_id: body.radiology_booking_id,
      doctor_id: body.doctor_id || (user.role === 'doctor' ? user.id : undefined),
      doctor_name: body.doctor_name || (user.role === 'doctor' ? user.full_name : undefined),
      facility_id: body.facility_id,
      facility_name: body.facility_name,
      attachments: body.attachments || [],
      issued_at: body.issued_at ? new Date(body.issued_at) : new Date(),
    });
    this.events.emit('medical_report.created', { id: r.id, patient_id: r.patient_id, critical: r.critical, tracking_id: r.tracking_id });
    return r.toObject();
  }

  /** Public-ish: get by tracking_id (for share/print without auth complications). */
  async byTracking(tracking_id: string, user: any) {
    const r = await this.model.findOne({ tracking_id }, { _id: 0, __v: 0 });
    if (!r) throw new NotFoundException();
    if (r.patient_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    return r;
  }
}
