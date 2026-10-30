import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { MedicalAccessLogService, logMedicalRead } from '../../common/pdpl-compliance.module';
import { revealHealthDoc, revealHealthDocs } from '../../common/health-fields';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { buildFollowUpActions } from './follow-up-actions';
import { isNewOutcome, resolveCodes, type CatalogueHit } from './appointment-outcomes';

const BOOKABLE = { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' } as const;
const CATALOGUE_PROJECTION = { _id: 0, id: 1, short_code: 1, code: 1, name_ar: 1, name_en: 1 } as const;
const BADGE_APPOINTMENTS = 200;

/**
 * What a visit left the patient (Design #2145, "My appointments" hub): the prescription, the requested lab tests and scans resolved to catalogue ids,
 * sick leave and certificates, reports, and the doctor's instructions; a "seen" mark per appointment drives the badge of new outcomes.
 * Patient-owned only: another user (including the booker, the doctor and an admin) gets 404, as for a missing appointment.
 */
@Injectable()
export class AppointmentOutcomesService {
  constructor(@InjectConnection() private readonly connection: Connection, @Optional() private readonly accessLog?: MedicalAccessLogService) {}

  private async ownAppointment(user: any, id: string): Promise<any> {
    if (typeof id !== 'string' || !id) throw new NotFoundException();
    const appt: any = await this.connection.collection('appointments').findOne({ id: { $eq: id } });
    if (!appt || !user?.id || String(appt.patient_id) !== String(user.id)) throw new NotFoundException();
    return appt;
  }

  private async resolveAll(collection: string, codes: string[]): Promise<ReturnType<typeof resolveCodes>> {
    const wanted = [...new Set((codes || []).map((c) => String(c ?? '').trim()).filter(Boolean))];
    if (!wanted.length) return [];
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const names = wanted.map((c) => new RegExp(`^${esc(c)}$`, 'i'));
    const rows = await this.connection.collection(collection)
      .find({ ...BOOKABLE, $or: [{ id: { $in: wanted } }, { short_code: { $in: names } }, { code: { $in: names } }, { name_ar: { $in: names } }, { name_en: { $in: names } }] }, { projection: CATALOGUE_PROJECTION })
      .limit(wanted.length * 5)
      .toArray();
    return resolveCodes(wanted, rows as unknown as CatalogueHit[]);
  }

  async outcomes(user: any, id: string) {
    const appt = await this.ownAppointment(user, id);
    const apptId = String(appt.id);
    const seenAt = appt.outcomes_seen_at ?? null;
    const patientId = String(appt.patient_id);

    const [rxRows, reportRows, referral, order] = await Promise.all([
      this.connection.collection('prescriptions').find({ patient_id: { $eq: patientId }, appointment_id: { $eq: apptId } }).sort({ createdAt: -1 }).limit(20).toArray(),
      this.connection.collection('medicalreports').find({ patient_id: { $eq: patientId }, appointment_id: { $eq: apptId } }, { projection: { _id: 0, body: 0, attachments: 0, shared_with_doctor_ids: 0, share_history: 0 } }).sort({ issued_at: -1, createdAt: -1 }).limit(50).toArray(),
      this.connection.collection('encounterreferrals').findOne({ appointment_id: appt._id }),
      this.connection.collection('medical_orders').findOne({ appointment_id: { $eq: apptId }, patient_id: { $eq: patientId } }, { projection: { _id: 0, id: 1, prescription_id: 1, valid_until: 1, items: 1 } }),
    ]);

    const prescriptions = revealHealthDocs('prescriptions', rxRows as any[]).map((p: any) => ({
      id: p.id, state: p.state ?? null, created_at: p.createdAt ?? null, valid_until: p.valid_until ?? null, diagnosis: p.diagnosis ?? null, notes: p.notes ?? null,
      items: (p.items || []).map((i: any) => ({
        medicine_id: i.medicine_id ?? null, name_ar: i.medicine_name_ar ?? null, name_en: i.medicine_name_en ?? null, dose: i.dose ?? null,
        times_per_day: i.times_per_day ?? null, duration_days: i.duration_days ?? null, quantity: i.quantity ?? null, instructions: i.instructions ?? null,
      })),
      is_new: isNewOutcome(p.createdAt, seenAt),
    }));

    const reports = revealHealthDocs('medicalreports', reportRows as any[]).map((r: any) => ({
      id: r.id, tracking_id: r.tracking_id ?? null, report_type: r.report_type, certificate_kind: r.certificate_kind ?? null,
      title_ar: r.title_ar ?? null, title_en: r.title_en ?? null, summary: r.summary ?? null, diagnosis: r.diagnosis ?? null, recommendations: r.recommendations ?? null,
      sick_leave: r.sick_leave ?? null, doctor_name: r.doctor_name ?? null, issued_at: r.issued_at ?? r.createdAt ?? null, viewed_by_patient: !!r.viewed_by_patient,
      is_new: !r.viewed_by_patient && isNewOutcome(r.createdAt ?? r.issued_at, seenAt),
    }));
    const certificates = reports.filter((r) => r.report_type === 'medical_certificate');

    const lab_tests = await this.resolveAll(CATALOG_COLLECTIONS.lab_services, (referral as any)?.requested_lab_tests ?? []);
    const radiology_scans = await this.resolveAll(CATALOG_COLLECTIONS.radiology_services, (referral as any)?.requested_radiology_scans ?? []);

    const revealed: any = revealHealthDoc('appointments', { summary: { ...(appt.summary || {}) } });
    const summary = revealed.summary || {};
    const instructions = {
      recommendations: summary.recommendations ?? null,
      notes: summary.notes ?? null,
      follow_up_recommended: !!summary.follow_up_recommended,
      follow_up_window_days: summary.follow_up_window_days ?? null,
      follow_up_actions: buildFollowUpActions(appt.prescriptions, (order as any) ?? null),
    };

    const unseen = prescriptions.filter((p) => p.is_new).length + reports.filter((r) => r.is_new).length
      + (referral && ((referral as any).requested_lab_tests?.length || (referral as any).requested_radiology_scans?.length) && isNewOutcome((referral as any).createdAt, seenAt) ? 1 : 0);

    // 16.9: prescriptions and medical reports are medical records: a row for every one this read returns
    await logMedicalRead(this.accessLog, user, [
      ...prescriptions.map((p) => ({ kind: 'prescription', id: String(p.id), action: 'read', subject_id: patientId })),
      ...reports.map((r) => ({ kind: 'medical_report', id: String(r.id), action: 'read', subject_id: patientId })),
    ] as any);

    return {
      appointment_id: apptId, status: appt.status ?? null, doctor_id: appt.doctor_id ?? null,
      prescriptions,
      lab_tests, radiology_scans,
      referral: referral ? { id: String((referral as any)._id), created_at: (referral as any).createdAt ?? null, is_new: isNewOutcome((referral as any).createdAt, seenAt) } : null,
      sick_leaves_and_certificates: certificates,
      reports: reports.filter((r) => r.report_type !== 'medical_certificate'),
      instructions,
      seen_at: seenAt,
      unseen_count: unseen,
    };
  }

  /** The patient opened the appointment's outcomes: everything issued so far is seen. Idempotent. */
  async markSeen(user: any, id: string) {
    const appt = await this.ownAppointment(user, id);
    const now = new Date();
    await this.connection.collection('appointments').updateOne({ _id: appt._id }, { $set: { outcomes_seen_at: now } });
    return { ok: true, appointment_id: String(appt.id), seen_at: now };
  }

  /** The badge of the hub: how many new outcomes the patient's completed visits hold (a prescription, an unread report or certificate, a referral). */
  async badge(user: any) {
    if (!user?.id) throw new NotFoundException();
    const patientId = String(user.id);
    const appts: any[] = await this.connection.collection('appointments')
      .find({ patient_id: { $eq: patientId }, status: 'completed' }, { projection: { _id: 1, id: 1, outcomes_seen_at: 1 } })
      .sort({ updatedAt: -1 }).limit(BADGE_APPOINTMENTS).toArray();
    if (!appts.length) return { unseen_total: 0, appointments: [] };
    const ids = appts.map((a) => String(a.id));
    const [rx, reports, referrals] = await Promise.all([
      this.connection.collection('prescriptions').find({ patient_id: { $eq: patientId }, appointment_id: { $in: ids } }, { projection: { _id: 0, appointment_id: 1, createdAt: 1 } }).toArray(),
      this.connection.collection('medicalreports').find({ patient_id: { $eq: patientId }, appointment_id: { $in: ids }, viewed_by_patient: { $ne: true } }, { projection: { _id: 0, appointment_id: 1, createdAt: 1, issued_at: 1 } }).toArray(),
      this.connection.collection('encounterreferrals').find({ appointment_id: { $in: appts.map((a) => a._id) } }, { projection: { appointment_id: 1, createdAt: 1, requested_lab_tests: 1, requested_radiology_scans: 1 } }).toArray(),
    ]);
    const counts = new Map<string, number>();
    const byId = new Map(appts.map((a) => [String(a.id), a]));
    const byOid = new Map(appts.map((a) => [String(a._id), a]));
    const add = (appt: any, createdAt: unknown) => { if (appt && isNewOutcome(createdAt, appt.outcomes_seen_at)) counts.set(String(appt.id), (counts.get(String(appt.id)) ?? 0) + 1); };
    for (const r of rx as any[]) add(byId.get(String(r.appointment_id)), r.createdAt);
    for (const r of reports as any[]) add(byId.get(String(r.appointment_id)), r.createdAt ?? r.issued_at);
    for (const r of referrals as any[]) if ((r.requested_lab_tests?.length || r.requested_radiology_scans?.length)) add(byOid.get(String(r.appointment_id)), r.createdAt);
    const list = [...counts.entries()].map(([appointment_id, unseen]) => ({ appointment_id, unseen }));
    return { unseen_total: list.reduce((n, a) => n + a.unseen, 0), appointments: list };
  }
}
