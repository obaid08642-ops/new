import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MedicalReport, MedicalReportType } from '../../schemas/medical-report.schema';
import { MedicalReportRepository } from "./repositories/medicalreport.repository";

@Injectable()
export class MedicalReportsService {
  constructor(
    @Inject('MedicalReportRepository') private readonly model: MedicalReportRepository,
    private readonly events: EventEmitter2,
    @InjectConnection() private readonly connection: Connection,
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
    if (r.patient_id !== user.id && user.role !== 'admin') {
      // Doctors explicitly granted by the patient may read the report.
      const pid = await this.ownDoctorProfileId(user);
      if (!pid || !(r.shared_with_doctor_ids || []).includes(pid)) throw new NotFoundException();
    }
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
    if (r.patient_id !== user.id && user.role !== 'admin') {
      const pid = await this.ownDoctorProfileId(user);
      if (!pid || !(r.shared_with_doctor_ids || []).includes(pid)) throw new NotFoundException();
    }
    return r;
  }

  /** Resolve the caller's provider profile id when they act as a doctor. */
  private async ownDoctorProfileId(user: any): Promise<string | null> {
    if (!user || user.role !== 'doctor') return null;
    const p: any = await this.connection.collection('provider_profiles').findOne(
      { $or: [{ user_id: user.id }, { account_id: user.id }] },
      { projection: { _id: 0, id: 1 } },
    ).catch(() => null);
    return p?.id || null;
  }

  /** Patient shares an owned report with a specific doctor (by profile id). */
  async share(user: any, id: string, body: { doctor_profile_id?: string; doctor_name?: string }) {
    const r: any = await this.model.findOne({ id });
    if (!r || r.patient_id !== user.id) throw new NotFoundException();
    const wanted = String(body?.doctor_profile_id || '').trim();
    if (!wanted) throw new BadRequestException('doctor_profile_id required');
    // The grant target must be a real doctor profile — no grants to ghosts.
    const target: any = await this.connection.collection('provider_profiles').findOne(
      { $or: [{ id: wanted }, { account_id: wanted }] },
      { projection: { _id: 0, id: 1, display_name_ar: 1, name_ar: 1 } },
    ).catch(() => null);
    if (!target) throw new BadRequestException('doctor_not_found');
    const pid: string = target.id;
    const list: string[] = Array.isArray(r.shared_with_doctor_ids) ? r.shared_with_doctor_ids : [];
    if (!list.includes(pid)) {
      list.push(pid);
      r.shared_with_doctor_ids = list;
      const hist: any[] = Array.isArray(r.share_history) ? r.share_history : [];
      hist.push({ doctor_id: pid, doctor_name: body?.doctor_name || target.display_name_ar || target.name_ar, shared_at: new Date() });
      r.share_history = hist;
      await r.save();
    }
    this.events.emit('medical_report.shared', { id: r.id, patient_id: r.patient_id, doctor_profile_id: pid });
    return { id: r.id, shared_with: r.shared_with_doctor_ids };
  }

  /** Patient revokes a doctor grant. */
  async unshare(user: any, id: string, doctorProfileId: string) {
    const r: any = await this.model.findOne({ id });
    if (!r || r.patient_id !== user.id) throw new NotFoundException();
    r.shared_with_doctor_ids = (r.shared_with_doctor_ids || []).filter((x: string) => x !== doctorProfileId);
    const hist: any[] = Array.isArray(r.share_history) ? r.share_history : [];
    const open = [...hist].reverse().find((h: any) => h.doctor_id === doctorProfileId && !h.revoked_at);
    if (open) open.revoked_at = new Date();
    r.share_history = hist;
    await r.save();
    return { id: r.id, shared_with: r.shared_with_doctor_ids };
  }

  /** Doctor inbox: reports patients explicitly shared with them. */
  async sharedWithMe(user: any) {
    if (!user || user.role !== 'doctor') throw new ForbiddenException('doctor only');
    const pid = await this.ownDoctorProfileId(user);
    if (!pid) return [];
    return this.model.find({ shared_with_doctor_ids: pid }, { _id: 0, __v: 0, body: 0 }).sort({ issued_at: -1, createdAt: -1 }).limit(100);
  }
}
