import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prescription, PrescriptionDocument } from '../../schemas/prescription.schema';
import { Appointment, AppointmentDocument, APPT_STATES } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { PrescriptionState, PRESCRIPTION_TRANSITIONS, UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { emitAudit } from '../audit-trail/audit-emitter';
import { MedicinesService } from '../medicines/medicines.service';
import { PrescriptionRepository } from "./repositories/prescription.repository";
import { getEffectiveRoles } from '../../common/auth.guard';

@Injectable()
export class PrescriptionsService {
  constructor(
    @Inject('PrescriptionRepository') private model: PrescriptionRepository,
    private medicines: MedicinesService,
    private events: EventEmitter2,
    @InjectModel(Appointment.name) private appointments: Model<AppointmentDocument>,
    @InjectModel(ProviderProfile.name) private providers: Model<ProviderProfileDocument>,
  ) {}

  private isPrivilegedAdmin(user: any) {
    const roles = getEffectiveRoles(user);
    return roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
  }

  private isOwningDoctor(rx: any, user: any) {
    return getEffectiveRoles(user).includes(UserRole.DOCTOR) && String(rx?.doctor_id || '') === String(user?.id || '');
  }

  private isAssignedPharmacy(rx: any, user: any) {
    return getEffectiveRoles(user).includes(UserRole.PHARMACY) && String(rx?.pharmacy_id || '') === String(user?.id || '');
  }

  /**
   * Creates a prescription only from a verified, in-progress doctor appointment.
   * Patient and doctor identifiers are derived and checked against the server-owned
   * appointment; manually entered or unverified medicines are intentionally refused.
   */
  async create(doctor: any, data: { patient_id: string; appointment_id?: string; items?: any[]; erx?: any[]; labs?: any[]; radiology?: any[]; diagnosis?: string; notes?: string }) {
    if (!getEffectiveRoles(doctor).includes(UserRole.DOCTOR)) {
      throw new BadRequestException('doctor role is required to create a prescription');
    }
    const doctorId = String(doctor?.id || '');
    const patientId = String(data?.patient_id || '');
    const appointmentId = String(data?.appointment_id || '');
    if (!doctorId || !patientId || !appointmentId) {
      throw new BadRequestException('verified appointment and patient are required');
    }
    // Provider app sends the medication lines as `erx`; accept both names.
    const rawItems = Array.isArray(data?.items) && data.items.length ? data.items : data?.erx;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new BadRequestException('at least one approved medicine is required');
    }
    data = { ...data, items: rawItems };

    const appointment: any = await this.appointments.findOne({
      id: appointmentId,
      patient_id: patientId,
      status: APPT_STATES.IN_PROGRESS,
    });
    const actorIds = [
      doctor?.id,
      doctor?.account_id,
      doctor?.provider_id,
      doctor?.provider_profile_id,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);
    const appointmentDoctorIds = [appointment?.doctor_user_id, appointment?.doctor_id]
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    if (!appointment || !actorIds.some(id => appointmentDoctorIds.includes(id))) {
      // Existence-hide foreign, stale, or unverified appointment identifiers.
      // Appointment ownership uses the same server-owned account/profile identity set
      // as its lifecycle mutations, rather than assuming a provider login's id always
      // equals ProviderProfile.user_id.
      throw new NotFoundException('verified in-progress appointment not found');
    }

    const items: any[] = [];
    for (const item of data.items) {
      const medicineId = String(item?.medicine_id || '').trim();
      const dose = String(item?.dose || '').trim();
      const durationDays = Number(item?.duration_days);
      if (!dose || !Number.isFinite(durationDays) || durationDays <= 0) {
        throw new BadRequestException('dose and positive duration_days are required');
      }

      if (!medicineId) {
        // A doctor may record an exceptional medicine only on this verified prescription.
        // It is deliberately not written to medicines_master and cannot be treated as approved.
        // installed provider-app versions send the typed name as medicine_name_ar/en
        const manualNameAr = String(item?.manual_name_ar || item?.medicine_name_ar || '').trim();
        const manualNameEn = String(item?.manual_name_en || item?.medicine_name_en || '').trim();
        if (!manualNameAr && !manualNameEn) {
          throw new BadRequestException('manual medicine name is required');
        }
        items.push({
          medicine_id: undefined,
          medicine_name_ar: manualNameAr || manualNameEn,
          medicine_name_en: manualNameEn || undefined,
          active_ingredient: String(item?.manual_active_ingredient || '').trim() || undefined,
          dose,
          frequency_hours: item.frequency_hours,
          times_per_day: item.times_per_day,
          duration_days: durationDays,
          instructions: item.instructions,
          is_manual_entry: true,
          verified: false,
          manual_review_status: 'PENDING_REVIEW',
        });
        continue;
      }

      const medicine: any = await this.medicines.getById(medicineId);
      if (medicine?.verified !== true) {
        throw new BadRequestException('medicine must be approved before prescription use');
      }
      items.push({
        medicine_id: medicine.id,
        medicine_name_ar: medicine.name_ar,
        medicine_name_en: medicine.name_en,
        active_ingredient: medicine.active_ingredient,
        dose,
        frequency_hours: item.frequency_hours,
        times_per_day: item.times_per_day,
        duration_days: durationDays,
        instructions: item.instructions,
        is_manual_entry: false,
        verified: true,
        manual_review_status: 'NOT_APPLICABLE',
      });
    }

    const rx: any = await this.model.create({
      doctor_id: doctorId,
      patient_id: patientId,
      appointment_id: appointmentId,
      items,
      diagnosis: String(data?.diagnosis || '').trim() || undefined,
      notes: String(data?.notes || '').trim() || undefined,
      has_manual_entries: items.some(item => item.is_manual_entry),
      state: PrescriptionState.CREATED_BY_DOCTOR,
    });
    await this.appointments.updateOne(
      { id: appointmentId, patient_id: patientId, doctor_id: appointment.doctor_id },
      { $addToSet: { prescriptions: rx.id } },
    );
    this.events.emit(EVENTS.PRESCRIPTION_CREATED, {
      prescription_id: rx.id,
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_id: appointmentId,
    });
    // Phase 23.2 — prescriptions issued in the audit trail (fire-and-forget).
    emitAudit(this.events, {
      action: 'prescription.issued',
      actor: { id: doctor?.id, role: String(doctor?.role || 'unknown') },
      entity: { type: 'prescription', id: rx.id },
      category: 'clinical',
    });
    return rx.toObject();
  }

  // Patient uploads scan (image OCR pending in AI module)
  async uploadByPatient(patient: any, data: { upload_image: string; items?: any[]; notes?: string }) {
    const items: any[] = [];
    let hasManual = false;
    for (const it of data.items || []) {
      // Normalize the name field — OCR may return any of these keys.
      const medName = (it.name_ar || it.medicine_name_ar || it.name || it.name_en || '').toString().trim();
      const medNameEn = (it.name_en || it.medicine_name_en || '').toString().trim() || undefined;
      if (!medName) continue; // skip blank items rather than crashing
      let medId = it.medicine_id;
      if (!medId) {
        try {
          const m = await this.medicines.createManualEntry(
            { name_ar: medName, name_en: medNameEn, active_ingredient: it.active_ingredient, category: 'medications' },
            patient.id,
            patient.role,
          );
          medId = m.id;
          hasManual = true;
        } catch (e) {
          // graceful — still record the line with no id so admin/pharmacy can review
          medId = undefined;
          hasManual = true;
        }
      }
      items.push({
        medicine_id: medId,
        medicine_name_ar: medName,
        medicine_name_en: medNameEn,
        active_ingredient: it.active_ingredient,
        dose: it.dose,
        frequency_hours: it.frequency_hours,
        times_per_day: it.times_per_day,
        duration_days: it.duration_days,
        quantity: it.quantity,
        instructions: it.frequency || it.instructions,
        is_manual_entry: !it.medicine_id,
      });
    }
    const rx = await this.model.create({
      patient_id: patient.id,
      upload_image: data.upload_image,
      notes: data.notes,
      // F19: a patient upload is NEVER a doctor-created prescription.
      state: PrescriptionState.UPLOADED_BY_PATIENT,
      items,
      has_manual_entries: hasManual,
    });
    this.events.emit(EVENTS.PRESCRIPTION_CREATED, { prescription_id: rx.id, patient_id: rx.patient_id });
    return rx.toObject();
  }

  async transition(id: string, to: string, by: any) {
    const rx = await this.model.findOne({ id });
    if (!rx) throw new NotFoundException();
    const isAdmin = this.isPrivilegedAdmin(by);
    const isInitialDoctorTransition = rx.state === PrescriptionState.CREATED_BY_DOCTOR && this.isOwningDoctor(rx, by);
    const isAssignedPharmacyTransition = rx.state !== PrescriptionState.CREATED_BY_DOCTOR && this.isAssignedPharmacy(rx, by);
    if (!isAdmin && !isInitialDoctorTransition && !isAssignedPharmacyTransition) {
      throw new NotFoundException();
    }
    const allowed = PRESCRIPTION_TRANSITIONS[rx.state] || [];
    if (!isAdmin && !allowed.includes(to)) {
      throw new BadRequestException(`Invalid transition ${rx.state} → ${to}`);
    }
    if (to === PrescriptionState.DISPENSED && (rx.items || []).some((item: any) =>
      item.is_manual_entry && item.manual_review_status !== 'SUBSTITUTED_APPROVED',
    )) {
      throw new BadRequestException('manual prescription items require an approved substitute before dispensing');
    }
    // F19: Rx-required catalog items cannot be approved until a pharmacist
    // verified the prescription (VERIFIED_BY_PHARMACIST). OTC-only scripts
    // keep the direct path.
    if (to === PrescriptionState.APPROVED && !rx.verified_by) {
      const needsRx = await this.hasRxRequiredItem(rx.items || []);
      if (needsRx) throw new BadRequestException('pharmacist_verification_required');
    }
    rx.state = to;
    if (to === PrescriptionState.SENT_TO_PHARMACY) this.events.emit(EVENTS.PRESCRIPTION_SENT, { prescription_id: id });
    if (to === PrescriptionState.DISPENSED) this.events.emit(EVENTS.PRESCRIPTION_DISPENSED, { prescription_id: id });
    await rx.save();
    return rx.toObject();
  }

  /** True when any line references a catalog medicine flagged Rx-required. */
  private async hasRxRequiredItem(items: any[]): Promise<boolean> {
    for (const item of items) {
      if (!item?.medicine_id) continue;
      try {
        const med: any = await this.medicines.getById(item.medicine_id);
        if (med?.requires_prescription) return true;
      } catch {
        // Fail closed: an unresolvable catalog reference still needs review.
        return true;
      }
    }
    return false;
  }

  /**
   * F19 pharmacist verification step. The caller must be the assigned pharmacy
   * (or admin); an unassigned patient upload is claimed by the verifying
   * pharmacy. Records verified_by/at, then moves to VERIFIED_BY_PHARMACIST.
   */
  async verifyByPharmacist(id: string, by: any) {
    const rx: any = await this.model.findOne({ id });
    if (!rx) throw new NotFoundException();
    const isAdmin = this.isPrivilegedAdmin(by);
    const isPharmacy = getEffectiveRoles(by).includes(UserRole.PHARMACY);
    if (!isAdmin && !isPharmacy) throw new NotFoundException();
    const assigned = rx.pharmacy_id && String(rx.pharmacy_id) === String(by?.id);
    const claimable = !rx.pharmacy_id && [PrescriptionState.UPLOADED_BY_PATIENT, PrescriptionState.SENT_TO_PHARMACY].includes(rx.state)
      && (isAdmin || await this.pharmacyReceivedOrderFor(String(rx.id), String(by?.id)));
    if (!isAdmin && !assigned && !claimable) throw new NotFoundException();
    if (!rx.pharmacy_id) rx.pharmacy_id = String(by.id);
    rx.verified_by = String(by.id);
    rx.verified_at = new Date();
    await rx.save();
    return this.transition(id, PrescriptionState.VERIFIED_BY_PHARMACIST, by);
  }

  /**
   * R11 §5: a pharmacy may claim an unassigned prescription only when it got
   * the patient's order carrying it — as a broadcast recipient or as the
   * selected pharmacy. Otherwise every pharmacy could read every upload.
   */
  private async pharmacyReceivedOrderFor(prescriptionId: string, pharmacyId: string): Promise<boolean> {
    const db: any = (this.providers as any)?.db;
    if (!db || !pharmacyId) return false;
    const orders: any[] = await db.collection('pharmacy_orders').find({ prescription_id: { $eq: prescriptionId } }, { projection: { id: 1 } }).limit(50).toArray();
    const orderIds = orders.map((o) => String(o.id)).filter(Boolean);
    if (!orderIds.length) return false;
    // The selected pharmacy holds a live allocation for the order. Once one
    // exists, only that pharmacy may claim; a rejected, cancelled or expired
    // allocation does not count. Before any selection, a broadcast recipient may.
    const liveFilter = { order_id: { $in: orderIds }, status: { $nin: ['rejected', 'cancelled', 'expired'] } };
    if (await db.collection('pharmacy_allocations').findOne({ ...liveFilter, pharmacy_account_id: { $eq: pharmacyId } })) return true;
    if (await db.collection('pharmacy_allocations').findOne(liveFilter)) return false;
    return !!(await db.collection('pharmacy_broadcast_recipients').findOne({ order_id: { $in: orderIds }, pharmacy_account_id: { $eq: pharmacyId } }));
  }

  async sendToPharmacy(id: string, pharmacy_id: string, by: any) {    const rx: any = await this.model.findOne({ id });
    if (!rx || (!this.isPrivilegedAdmin(by) && !this.isOwningDoctor(rx, by))) throw new NotFoundException();
    if (rx.state !== PrescriptionState.CREATED_BY_DOCTOR) {
      throw new BadRequestException(`Invalid transition ${rx.state} → ${PrescriptionState.SENT_TO_PHARMACY}`);
    }
    rx.pharmacy_id = String(pharmacy_id || '');
    if (!rx.pharmacy_id) throw new BadRequestException('pharmacy_id is required');
    rx.state = PrescriptionState.SENT_TO_PHARMACY;
    await rx.save();
    this.events.emit(EVENTS.PRESCRIPTION_SENT, { prescription_id: id, pharmacy_id: rx.pharmacy_id });
    return rx.toObject();
  }

  async substitute(id: string, itemIndex: number, newMedicineId: string, by: any) {
    const rx = await this.model.findOne({ id });
    if (!rx || (!this.isPrivilegedAdmin(by) && !this.isAssignedPharmacy(rx, by))) throw new NotFoundException();
    const item: any = rx.items[itemIndex];
    if (!item) throw new BadRequestException('Invalid item index');
    const medicine: any = await this.medicines.getById(String(newMedicineId || ''));
    if (medicine?.verified !== true) {
      throw new BadRequestException('manual prescription items require an approved substitute');
    }
    item.substituted = true;
    item.substituted_to_medicine_id = medicine.id;
    if (item.is_manual_entry) {
      item.manual_review_status = 'SUBSTITUTED_APPROVED';
      item.manual_reviewed_by = by?.id;
      item.manual_reviewed_at = new Date();
    }
    rx.state = PrescriptionState.PARTIALLY_EDITED;
    await rx.save();
    this.events.emit(EVENTS.PRESCRIPTION_MODIFIED, { prescription_id: id });
    return rx.toObject();
  }

  /** Manual prescription items stay on their prescription and are reviewed by the assigned pharmacy or an admin. */
  async manualReviewQueue(user: any) {
    const query: any = {
      has_manual_entries: true,
      'items.manual_review_status': 'PENDING_REVIEW',
    };
    if (user?.role !== UserRole.ADMIN) query.pharmacy_id = user?.id;
    return this.model.find(query, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
  }

  /** Active prescriptions for the patient — everything not dispensed/archived. */
  async activeForPatient(user: any) {
    return this.model.find(
      { patient_id: user.id, state: { $nin: [PrescriptionState.DISPENSED, PrescriptionState.ARCHIVED] } },
      { _id: 0, __v: 0 },
    ).sort({ createdAt: -1 }).limit(100);
  }

  async listMine(patient_id: string) {
    return this.model.find({ patient_id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
  }
  async listForDoctor(doctor_id: string) {
    return this.model.find({ doctor_id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
  }
  async listForPharmacy(pharmacy_id: string) {
    return this.model.find({ pharmacy_id, state: { $in: [PrescriptionState.SENT_TO_PHARMACY, PrescriptionState.PARTIALLY_EDITED, PrescriptionState.APPROVED] } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
  }
  private async toPatientWebDto(rx: any) {
    let doctor: any = null;
    if (rx.doctor_id) {
      doctor = await this.providers.findOne({
        $or: [{ user_id: rx.doctor_id }, { account_id: rx.doctor_id }, { id: rx.doctor_id }],
      }, { _id: 0, display_name_ar: 1, display_name_en: 1, name_ar: 1, name_en: 1, specialty: 1 }).lean();
    }
    return {
      id: rx.id,
      status: rx.state,
      items: (rx.items || []).map((item: any) => ({
        name: item.medicine_name_ar || item.medicine_name_en || null,
        dose: item.dose || null,
        frequency: item.frequency_hours != null ? { every_hours: item.frequency_hours } : (item.times_per_day != null ? { times_per_day: item.times_per_day } : null),
        duration: item.duration_days ?? null,
      })),
      issued_at: rx.createdAt ? new Date(rx.createdAt).toISOString() : null,
      doctor: {
        display_name: doctor?.display_name_ar || doctor?.display_name_en || doctor?.name_ar || doctor?.name_en || null,
        specialty: doctor?.specialty || null,
      },
    };
  }

  /**
   * Returns a prescription only to a participating patient, doctor, pharmacy,
   * or privileged administrator. A foreign lookup is deliberately indistinguishable
   * from a missing record so identifiers cannot be used for enumeration.
   */
  async getByIdForUser(id: string, user: any) {
    const rx: any = await this.model.findOne({ id }, { _id: 0, __v: 0 });
    if (!rx) throw new NotFoundException();
    const roles = getEffectiveRoles(user);
    const hasPrivilegedAdminRole = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
    const isParticipant = [rx.patient_id, rx.doctor_id, rx.pharmacy_id].filter(Boolean).includes(user?.id);
    if (!hasPrivilegedAdminRole && !isParticipant) throw new NotFoundException();
    // Phase 23.2 — prescriptions viewed in the audit trail (16.9, fire-and-forget).
    emitAudit(this.events, {
      action: 'prescription.viewed',
      actor: { id: user?.id, role: String(user?.role || 'unknown') },
      entity: { type: 'prescription', id: rx.id },
      category: 'clinical',
    });
    return this.toPatientWebDto(rx);
  }

  // ===== P22.9 — prescription PDF with a verifying QR code =====
  /**
   * Signed verification tokens. The QR printed on the PDF carries ONLY this
   * opaque token (no names, no doses) — it leaks nothing beyond what the
   * public verification endpoint returns. The fingerprint binds the token to
   * the prescription's immutable core, so editing the lines after issuance
   * invalidates previously printed QRs.
   */
  private qrSecret(): string {
    const s = String(process.env.PRESCRIPTION_QR_SECRET ?? '').trim();
    if (!s) throw new BadRequestException('prescription_qr_not_configured');
    return s;
  }

  private fingerprint(rx: {
    id: string; patient_id: string; doctor_id?: string; items: Array<Record<string, unknown>>; createdAt?: Date;
  }): string {
    const core = {
      id: rx.id,
      patient_id: rx.patient_id,
      doctor_id: rx.doctor_id ?? null,
      createdAt: rx.createdAt ? new Date(rx.createdAt).toISOString() : null,
      items: (rx.items ?? []).map((it) => ({
        medicine_id: it['medicine_id'] ?? null,
        ar: it['medicine_name_ar'] ?? null,
        en: it['medicine_name_en'] ?? null,
        dose: it['dose'] ?? null,
        duration_days: it['duration_days'] ?? null,
      })),
    };
    return createHash('sha256').update(JSON.stringify(core)).digest('hex').slice(0, 32);
  }

  private b64url(buf: Buffer): string {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private unb64url(s: string): Buffer {
    const padded = s.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded, 'base64');
  }

  /** Mint a verification token (default 2-year validity). */
  issueVerifyToken(
    rx: { id: string; patient_id: string; doctor_id?: string; items: Array<Record<string, unknown>>; createdAt?: Date },
    ttlMs: number = 2 * 365 * 24 * 3600_000,
  ): string {
    const payload = { rx: rx.id, iat: Date.now(), exp: Date.now() + ttlMs, h: this.fingerprint(rx) };
    const body = this.b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
    const sig = this.b64url(createHmac('sha256', this.qrSecret()).update(body).digest());
    return `${body}.${sig}`;
  }

  verifyUrl(token: string): string {
    const base = String(process.env.PRESCRIPTION_VERIFY_BASE ?? '/prescriptions/verify').replace(/\/$/, '');
    return `${base}/${token}`;
  }

  /**
   * Public verification: recompute the HMAC, enforce expiry, then confirm the
   * live prescription still matches the fingerprint. Always resolves (never
   * throws for bad input) so scanners get a verdict, not an error page.
   */
  async verifyToken(token: string): Promise<Record<string, unknown>> {
    const invalid = (reason: string) => ({ authentic: false, reason });
    const parts = String(token ?? '').split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return invalid('malformed_token');
    let payload: { rx?: string; iat?: number; exp?: number; h?: string };
    try {
      payload = JSON.parse(this.unb64url(parts[0]).toString('utf8'));
    } catch {
      return invalid('malformed_token');
    }
    if (!payload || typeof payload.rx !== 'string' || !Number.isFinite(payload.exp) || typeof payload.h !== 'string') {
      return invalid('malformed_token');
    }
    let secret: string;
    try {
      secret = this.qrSecret();
    } catch {
      return invalid('verifier_not_configured');
    }
    const expectSig = this.b64url(createHmac('sha256', secret).update(parts[0]).digest());
    const a = Buffer.from(expectSig);
    const b = Buffer.from(parts[1]);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return invalid('signature_mismatch');
    if (Number(payload.exp) < Date.now()) return invalid('expired');
    const rx = await this.model.findOne({ id: payload.rx }, { _id: 0, __v: 0 });
    if (!rx) return invalid('prescription_not_found');
    const raw = typeof rx.toObject === 'function' ? rx.toObject() : rx;
    if (this.fingerprint(raw) !== payload.h) return invalid('content_changed_since_issue');
    return {
      authentic: true,
      prescription: {
        id: raw.id,
        state: raw.state,
        issued_at: raw.createdAt ? new Date(raw.createdAt).toISOString() : null,
        doctor_id: raw.doctor_id ?? null,
        diagnosis: raw.diagnosis ?? null,
        items: (raw.items ?? []).map((it: Record<string, unknown>) => ({
          name: it['medicine_name_ar'] ?? it['medicine_name_en'] ?? null,
          dose: it['dose'] ?? null,
          duration_days: it['duration_days'] ?? null,
        })),
      },
    };
  }

  private async qrPng(text: string): Promise<Buffer | null> {
    try {
      // qrcode is a declared dependency (also used by billing); require keeps
      // this working even if the ESM/CJS interop shifts under ts-jest.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const QRCode = require('qrcode') as { toBuffer(s: string, o: unknown): Promise<Buffer> };
      return await QRCode.toBuffer(text, { type: 'png', width: 220, margin: 1 });
    } catch {
      return null;
    }
  }

  /**
   * Participant-only PDF. The QR encodes the verify URL (opaque token only);
   * the human-readable page mirrors exactly what the endpoint returns.
   */
  async prescriptionPdf(user: { id: string; role?: string }, id: string): Promise<Buffer> {
    const found = await this.model.findOne({ id }, { _id: 0, __v: 0 });
    if (!found) throw new NotFoundException();
    const rx = typeof found.toObject === 'function' ? found.toObject() : found;
    const roles = getEffectiveRoles(user);
    const privileged = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
    const participant = [rx.patient_id, rx.doctor_id, rx.pharmacy_id].filter(Boolean).includes(user?.id);
    if (!privileged && !participant) throw new NotFoundException();
    const token = this.issueVerifyToken(rx);
    const url = this.verifyUrl(token);
    const qr = await this.qrPng(url);
    const items = Array.isArray(rx.items) ? rx.items : [];
    interface PdfDoc {
      on(event: string, cb: (chunk?: Buffer) => void): void;
      end(): void;
      fontSize(n: number): PdfDoc;
      fillColor(c: string): PdfDoc;
      text(t: string, opts?: Record<string, unknown>): PdfDoc;
      moveDown(n?: number): PdfDoc;
      image(b: Buffer, opts?: Record<string, unknown>): PdfDoc;
    }
    const Ctor = (() => {
      // pdfkit is CJS (module.exports = class): require keeps the constructor
      // intact under ts-jest, where `import *` yields a namespace object.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('pdfkit') as unknown as new (opts: Record<string, unknown>) => PdfDoc;
    })();
    return new Promise((resolve, reject) => {
      const doc = new Ctor({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c?: Buffer) => { if (c) chunks.push(c); });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(20).fillColor('#0F766E').text('Nabd — Prescription / وصفة طبية', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#555555').text(`Rx: ${rx.id}`, { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(11).fillColor('#111111').text(`Issued: ${rx.createdAt ? new Date(rx.createdAt).toISOString() : '—'}`);
      doc.fontSize(11).text(`State: ${rx.state ?? '—'}`);
      if (rx.diagnosis) doc.fontSize(11).text(`Diagnosis: ${rx.diagnosis}`);
      doc.moveDown(0.5);
      doc.fontSize(12).text('Medicines:', { underline: true });
      items.slice(0, 30).forEach((it: Record<string, unknown>) => {
        doc.fontSize(10).text(
          `- ${it['medicine_name_ar'] ?? it['medicine_name_en'] ?? '?'} — ${it['dose'] ?? '?'} × ${it['duration_days'] ?? '?'} days`,
        );
      });
      doc.moveDown(1.5);
      if (qr) {
        doc.image(qr, { fit: [180, 180], align: 'center' });
        doc.fontSize(8).fillColor('#555555').text('Scan to verify authenticity', { align: 'center' });
      }
      doc.fontSize(8).fillColor('#555555').text(url, { align: 'center' });
      doc.end();
    });
  }
}
