import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { recordAudit } from '../../common/audit-record';
import { SPECIALTY_MASTER } from '../../common/enums';
import { protectHealthDoc, revealHealthDoc, revealHealthDocs } from '../../common/health-fields';
import { TRACK_PREFIX, trackingId } from '../../common/tracking';
import { CODE_RE, initialsOf, maskNationalId, newVerifyCode, planLeave, serialOf } from './sick-leave-rules';
import { renderSickLeavePdf } from './sick-leave-pdf';

const ISSUABLE_STATES = ['IN_PROGRESS', 'COMPLETED'];
const REPORTS = 'medicalreports';

export interface IssueSickLeaveInput {
  patient_id?: string; appointment_id?: string; diagnosis?: string; reason?: string; show_diagnosis?: boolean;
  duration_days?: number; start_date?: string; patient_name?: string; recommendations?: string;
}

/**
 * Sick-leave certificates (owner decision PT-08, 2026-11-09). A certificate is a `medicalreports` row (report_type 'medical_certificate', certificate_kind
 * 'sick_leave') that already existed and that the patient app already reads: it gains a serial, a verify code, a status (issued / revoked), the consultation it
 * belongs to and the doctor's licence. The doctor's wording of the reason and the patient's ID number are encrypted as health data (common/health-fields.ts).
 * It is a document issued by a licensed provider through the platform, NOT a government document: `seha_ref` is kept empty for a later Seha link.
 */
@Injectable()
export class SickLeaveService implements OnModuleInit {
  private readonly logger = new Logger(SickLeaveService.name);
  constructor(@InjectConnection() private readonly conn: Connection, @Optional() private readonly events?: EventEmitter2) {}

  /** A serial and a verify code are each unique among certificates (partial: other medical reports have neither). A failure here is logged; issuing still works (a clash is retried). */
  async onModuleInit() {
    try {
      await this.reports.createIndex({ serial: 1 }, { unique: true, name: 'sick_leave_serial_unique', partialFilterExpression: { serial: { $type: 'string' } } });
      await this.reports.createIndex({ verify_code: 1 }, { unique: true, name: 'sick_leave_code_unique', partialFilterExpression: { verify_code: { $type: 'string' } } });
    } catch (e: any) { this.logger.warn(`sick-leave indexes not created: ${e?.message}`); }
  }

  private get reports() { return this.conn.collection('medicalreports'); }

  private async nextSerial(now: Date): Promise<string> {
    const year = now.getUTCFullYear();
    const row: any = await this.conn.collection('sick_leave_counters').findOneAndUpdate(
      { _id: `serial-${year}` } as any, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' },
    );
    const seq = Number((row?.value ?? row)?.seq);
    if (!Number.isInteger(seq) || seq < 1) throw new BadRequestException('sick_leave_serial_unavailable');
    return serialOf(year, seq);
  }

  /** The doctor issues a sick leave on a consultation of theirs (in progress or finished). Whether or not the patient asked for one. */
  async issue(doctor: any, routeAppointmentId: string | undefined, body: IssueSickLeaveInput) {
    if (!body?.patient_id) throw new BadRequestException('patient_id required');
    const diagnosis = typeof body.diagnosis === 'string' ? body.diagnosis.trim() : '';
    if (!diagnosis) throw new BadRequestException('diagnosis required');
    const patientId = String(body.patient_id);
    const ids = [body.appointment_id, routeAppointmentId].filter((x): x is string => typeof x === 'string' && x.length > 0 && x !== 'new');
    const appt: any = ids.length
      ? await this.conn.collection('appointments').findOne({ id: { $in: ids }, patient_id: { $eq: patientId }, doctor_user_id: { $eq: String(doctor?.id) } })
      : null;
    if (!appt) throw new BadRequestException('sick_leave_needs_consultation');
    if (!ISSUABLE_STATES.includes(String(appt.status || '').toUpperCase())) throw new BadRequestException('sick_leave_consultation_not_started');

    const now = new Date();
    const consultationAt = new Date(appt.slot_start);
    const plan = planLeave(body, isNaN(consultationAt.getTime()) ? now : consultationAt, now);

    const [profile, patient, account]: any[] = await Promise.all([
      this.conn.collection('provider_profiles').findOne({ id: appt.doctor_id }),
      this.conn.collection('users').findOne({ id: patientId }, { projection: { full_name: 1, national_id: 1 } }),
      this.conn.collection('provider_accounts').findOne({ $or: [{ user_id: String(doctor?.id) }, { id: String(doctor?.id) }] }),
    ]);
    const spec = SPECIALTY_MASTER.find((s) => s.slug === (profile?.specialty || profile?.specialty_ar));
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 500) : null;
    const serial = await this.nextSerial(now);
    const days = plan.days;
    const base = {
      id: uuid(),
      tracking_id: trackingId(TRACK_PREFIX.medical_report),
      serial,
      status: 'issued',
      patient_id: patientId,
      patient_name: body.patient_name || patient?.full_name || null,
      patient_national_id: patient?.national_id || null,
      report_type: 'medical_certificate',
      certificate_kind: 'sick_leave',
      title_ar: `إجازة مرضية لمدة ${days} ${days === 1 ? 'يوم' : 'أيام'}`,
      title_en: `${days}-day sick leave certificate`,
      summary: diagnosis,
      diagnosis,
      reason,
      show_diagnosis: body.show_diagnosis === true,
      recommendations: body.recommendations || null,
      sick_leave: { start_date: plan.start, end_date: plan.end, duration_days: days },
      doctor_id: String(doctor?.id),
      doctor_name: doctor?.full_name || profile?.name_ar || profile?.name_en || account?.display_name || null,
      doctor_specialty_ar: spec?.name_ar ?? null,
      doctor_specialty_en: spec?.name_en ?? null,
      doctor_license_no: profile?.scfhs_license_number || profile?.license_number || null,
      facility_id: account?._id ? String(account._id) : null,
      facility_name: account?.display_name || null,
      appointment_id: String(appt.id),
      consultation_at: isNaN(consultationAt.getTime()) ? null : consultationAt,
      booking_ref: appt.tracking_id || String(appt.id),
      requested_by_patient: appt.sick_leave_requested === true,
      seha_ref: null,
      attachments: [],
      issued_at: now, createdAt: now, updatedAt: now,
    };
    // the verify code is random: a clash is possible in theory, so a refused insert tries a new one
    let doc: any;
    for (let attempt = 0; ; attempt++) {
      doc = protectHealthDoc(REPORTS, { ...base, verify_code: newVerifyCode() });
      try { await this.reports.insertOne(doc); break; } catch (e: any) { if (e?.code !== 11000 || attempt >= 4) throw e; }
    }
    // the visit's own timeline keeps the short record it always had (the reason there is encrypted separately)
    const reasonCipher = protectHealthDoc('appointments', { sickLeaves: [{ reason: diagnosis }] }).sickLeaves[0].reason;
    await this.conn.collection('appointments').updateOne({ id: appt.id } as any, { $push: { sickLeaves: { days, reason: reasonCipher, tracking_id: base.tracking_id, serial, at: now } } } as any);
    this.events?.emit('medical_report.created', { id: base.id, patient_id: patientId, critical: false, tracking_id: base.tracking_id });
    this.events?.emit('sick_leave.issued', { patient_id: patientId, doctor_id: base.doctor_id, tracking_id: base.tracking_id, serial, days });
    await recordAudit(this.conn, { action: 'sick_leave.issued', user_id: String(doctor?.id), role: 'doctor', resource_kind: 'sick_leave', resource_id: serial, details: { appointment_id: base.appointment_id, days, from: plan.start, requested_by_patient: base.requested_by_patient } } as any);
    return {
      ok: true, message: 'sick_leave_issued', id: base.id, serial, code: doc.verify_code, tracking_id: base.tracking_id,
      verify_url: `/verify/sick-leave/${doc.verify_code}`, days, start_date: plan.start, end_date: plan.end,
    };
  }

  /** The doctor withdraws a certificate they issued, with a reason (an admin may too). It stays on record as revoked; the verify page says so. */
  async revoke(user: any, idOrSerial: string, reason: unknown) {
    const why = typeof reason === 'string' ? reason.trim() : '';
    if (!why) throw new BadRequestException('revoke_reason_required');
    const key = String(idOrSerial || '');
    const cert: any = await this.reports.findOne({ certificate_kind: 'sick_leave', $or: [{ id: { $eq: key } }, { serial: { $eq: key } }] });
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);
    if (!cert || (!isAdmin && cert.doctor_id !== String(user?.id))) throw new NotFoundException('sick_leave_not_found');
    if (cert.status === 'revoked') throw new ConflictException('sick_leave_already_revoked');
    const now = new Date();
    const res: any = await this.reports.updateOne({ id: cert.id, status: { $ne: 'revoked' } } as any, { $set: { status: 'revoked', revoked_at: now, revoked_by: String(user?.id), revoke_reason: why.slice(0, 500), updatedAt: now } });
    if (!res?.matchedCount) throw new ConflictException('sick_leave_already_revoked');
    this.events?.emit('sick_leave.revoked', { patient_id: cert.patient_id, doctor_id: cert.doctor_id, serial: cert.serial });
    await recordAudit(this.conn, { action: 'sick_leave.revoked', user_id: String(user?.id), role: user?.role, resource_kind: 'sick_leave', resource_id: cert.serial, details: { reason: why.slice(0, 500) } } as any);
    return { ok: true, serial: cert.serial, status: 'revoked', revoked_at: now };
  }

  private shape(cert: any, full: boolean) {
    const c: any = revealHealthDoc(REPORTS, { ...cert });
    const leave = c.sick_leave || {};
    const out: any = {
      id: c.id, serial: c.serial ?? null, status: c.status ?? 'issued', issued_at: c.issued_at ?? c.createdAt ?? null,
      from: leave.start_date ?? null, to: leave.end_date ?? null, days: leave.duration_days ?? null,
      doctor_name: c.doctor_name ?? null, national_id: maskNationalId(c.patient_national_id),
      verify_code: c.verify_code ?? null, revoked_at: c.revoked_at ?? null,
    };
    if (full) {
      Object.assign(out, {
        patient_name: c.patient_name ?? null, national_id: c.patient_national_id ?? null,
        doctor_specialty_ar: c.doctor_specialty_ar ?? null, doctor_specialty_en: c.doctor_specialty_en ?? null, doctor_license_no: c.doctor_license_no ?? null,
        consultation_at: c.consultation_at ?? null, booking_ref: c.booking_ref ?? null, reason: c.reason ?? null,
        diagnosis: c.show_diagnosis === true ? c.diagnosis ?? null : null, show_diagnosis: c.show_diagnosis === true,
        revoke_reason: c.revoke_reason ?? null, seha_ref: c.seha_ref ?? null, tracking_id: c.tracking_id ?? null,
      });
    }
    return out;
  }

  /** The patient's own certificates; the ID number is masked in the list. */
  async listForPatient(patientId: string) {
    const rows = await this.reports.find({ patient_id: { $eq: patientId }, certificate_kind: 'sick_leave' }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
    return revealHealthDocs(REPORTS, rows as any[]).map((r: any) => this.shape(r, false));
  }

  /** One of the patient's own certificates in full (someone else's is "not found", not "forbidden"). */
  async oneForPatient(patientId: string, idOrSerial: string) {
    const key = String(idOrSerial || '');
    const cert = await this.reports.findOne({ patient_id: { $eq: patientId }, certificate_kind: 'sick_leave', $or: [{ id: { $eq: key } }, { serial: { $eq: key } }] }, { projection: { _id: 0 } });
    if (!cert) throw new NotFoundException('sick_leave_not_found');
    return this.shape(cert, true);
  }

  async pdfForPatient(patientId: string, idOrSerial: string): Promise<Buffer> {
    const cert = await this.oneForPatient(patientId, idOrSerial);
    const base = String(process.env.NABD_PUBLIC_URL || 'https://nabd.plus').replace(/\/+$/, '');
    const url = `${base}/verify/sick-leave/${cert.verify_code}`;
    let qrPng: Buffer | null = null;
    try { qrPng = await require('qrcode').toBuffer(url, { type: 'png', width: 220, margin: 1 }); } catch { qrPng = null; }
    return renderSickLeavePdf({ cert, qrPng, verifyUrl: url });
  }

  /** The doctor's own issued certificates (newest first), without the patient's ID number. */
  async listForDoctor(doctorId: string) {
    const rows = await this.reports.find({ doctor_id: { $eq: doctorId }, certificate_kind: 'sick_leave' }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
    return revealHealthDocs(REPORTS, rows as any[]).map((r: any) => ({ ...this.shape(r, false), national_id: undefined, patient_name: r.patient_name ?? null }));
  }

  /** The public page behind the QR: valid or revoked, the initials, the dates. Never a diagnosis, a reason, an ID number or a full name. */
  async verify(code: string) {
    const c = String(code || '').trim().toUpperCase();
    if (!CODE_RE.test(c)) throw new NotFoundException('not_found');
    const cert: any = await this.reports.findOne({ verify_code: { $eq: c }, certificate_kind: 'sick_leave' }, { projection: { _id: 0, patient_name: 1, serial: 1, status: 1, sick_leave: 1, issued_at: 1, revoked_at: 1 } });
    if (!cert) throw new NotFoundException('not_found');
    const r: any = revealHealthDoc(REPORTS, { ...cert });
    return {
      valid: (cert.status ?? 'issued') === 'issued', status: cert.status ?? 'issued', serial: cert.serial ?? null, initials: initialsOf(r.patient_name),
      from: cert.sick_leave?.start_date ?? null, to: cert.sick_leave?.end_date ?? null, days: cert.sick_leave?.duration_days ?? null,
      issued_at: cert.issued_at ?? null, ...(cert.status === 'revoked' ? { revoked_at: cert.revoked_at ?? null } : {}),
    };
  }
}
