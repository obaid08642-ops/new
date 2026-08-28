/**
 * Provider Operations module — fills the remaining workflow gaps per provider type:
 *
 *  DOCTOR:    vacation/leave management, prescription templates, saved diagnoses,
 *             patient blacklist, emergency closing for a day.
 *  LAB:       QC states (sample rejected/recollect), urgent/STAT priority,
 *             critical values with doctor+patient notification, double verification.
 *  NURSING:   visit checklists (before/supplies/after), patient signature on
 *             completion, GPS track points, emergency escalation.
 *  AMBULANCE: ETA computation, live tracking points, hospital handover,
 *             completion report.
 *  FINANCE:   invoice PDF per order, wallet ledger transactions for providers.
 */
import { Module, Injectable, Controller, Get, Post, Put, Delete, Body, Param, Query, Res, UseGuards, BadRequestException, ForbiddenException, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Schema } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';

/** Provider withdrawal requests (consumed by admin-web-core finance controller). */
export const ProviderWithdrawalSchema = new Schema(
  {
    id: { type: String, index: true, unique: true },
    provider_id: { type: String, index: true },
    amount: Number,
    state: { type: String, default: 'PENDING_ADMIN_APPROVAL', index: true },
    iban: String,
    bank_name: String,
    reference: String,
    decided_by: String,
    decided_at: Date,
    reject_reason: String,
  },
  { timestamps: true, collection: 'providerwithdrawals', strict: false },
);

@Injectable()
export class ProviderOpsService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  // ═══ DOCTOR: vacation / leave management ═════════════════════════════════
  async addLeave(doctorId: string, body: { start_date: string; end_date: string; type: string; note?: string }) {
    if (!body?.start_date || !body?.end_date) throw new BadRequestException('start_date and end_date required');
    const start = new Date(body.start_date);
    const end = new Date(body.end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) throw new BadRequestException('invalid date range');
    const doc = {
      id: `leave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      doctor_id: doctorId,
      start_date: start,
      end_date: end,
      type: ['vacation', 'leave', 'break', 'emergency_closing'].includes(body.type) ? body.type : 'leave',
      note: body.note || null,
      status: 'active',
      createdAt: new Date(),
    };
    await this.conn.collection('doctor_leaves').insertOne(doc);
    return { ok: true, leave: doc };
  }

  async myLeaves(doctorId: string): Promise<any[]> {
    return this.conn.collection('doctor_leaves').find({ doctor_id: doctorId, status: 'active' }).sort({ start_date: 1 }).limit(50).toArray();
  }

  async cancelLeave(doctorId: string, leaveId: string) {
    await this.conn.collection('doctor_leaves').updateOne(
      { id: leaveId, doctor_id: doctorId },
      { $set: { status: 'cancelled', updatedAt: new Date() } },
    );
    return { ok: true };
  }

  /** Booking guard: is the doctor on leave at this time? (used by booking flow) */
  async isOnLeave(doctorId: string, when: Date): Promise<boolean> {
    const hit = await this.conn.collection('doctor_leaves').findOne({
      doctor_id: doctorId,
      status: 'active',
      start_date: { $lte: when },
      end_date: { $gte: when },
    });
    return !!hit;
  }

  // ═══ DOCTOR: prescription templates / saved diagnoses / blacklist ════════
  async saveTemplate(doctorId: string, body: { name: string; items: any[]; notes?: string }) {
    if (!body?.name || !Array.isArray(body?.items) || !body.items.length) throw new BadRequestException('name and items required');
    const doc = { id: `tpl_${Date.now()}`, doctor_id: doctorId, name: body.name, items: body.items, notes: body.notes || null, usage_count: 0, createdAt: new Date() };
    await this.conn.collection('prescription_templates').insertOne(doc);
    return { ok: true, template: doc };
  }

  async myTemplates(doctorId: string): Promise<any[]> {
    return this.conn.collection('prescription_templates').find({ doctor_id: doctorId }).sort({ usage_count: -1, createdAt: -1 }).limit(50).toArray();
  }

  async deleteTemplate(doctorId: string, id: string) {
    await this.conn.collection('prescription_templates').deleteOne({ id, doctor_id: doctorId });
    return { ok: true };
  }

  async saveDiagnosis(doctorId: string, body: { name_ar: string; name_en?: string; icd?: string; notes?: string }) {
    if (!body?.name_ar) throw new BadRequestException('name_ar required');
    const doc = { id: `dx_${Date.now()}`, doctor_id: doctorId, ...body, usage_count: 0, createdAt: new Date() };
    await this.conn.collection('saved_diagnoses').insertOne(doc);
    return { ok: true, diagnosis: doc };
  }

  async myDiagnoses(doctorId: string, search?: string): Promise<any[]> {
    const q: any = { doctor_id: doctorId };
    if (search) q.$or = [{ name_ar: { $regex: search, $options: 'i' } }, { name_en: { $regex: search, $options: 'i' } }];
    return this.conn.collection('saved_diagnoses').find(q).sort({ usage_count: -1 }).limit(50).toArray();
  }

  async blacklistPatient(doctorId: string, patientId: string, reason?: string) {
    if (!patientId) throw new BadRequestException('patient_id required');
    await this.conn.collection('doctor_blacklist').updateOne(
      { doctor_id: doctorId, patient_id: patientId },
      { $set: { doctor_id: doctorId, patient_id: patientId, reason: reason || null, active: true, createdAt: new Date() } },
      { upsert: true },
    );
    return { ok: true, blacklisted: true };
  }

  async unblacklistPatient(doctorId: string, patientId: string) {
    await this.conn.collection('doctor_blacklist').updateOne(
      { doctor_id: doctorId, patient_id: patientId },
      { $set: { active: false, updatedAt: new Date() } },
    );
    return { ok: true };
  }

  async myBlacklist(doctorId: string): Promise<any[]> {
    return this.conn.collection('doctor_blacklist').find({ doctor_id: doctorId, active: true }, { projection: { _id: 0 } }).toArray();
  }

  // ═══ DOCTOR: per-patient CRM (tags / notes / vip / favorite) ═══
  async getPatientCrm(doctorId: string, patientId: string): Promise<any> {
    const doc: any = await this.conn.collection('doctor_patient_crm').findOne(
      { doctor_id: doctorId, patient_id: patientId },
      { projection: { _id: 0 } },
    );
    return doc?.data || { tags: [], notes: [], vip: false, favorite: false };
  }

  async putPatientCrm(doctorId: string, patientId: string, data: any): Promise<any> {
    const clean = {
      tags: Array.isArray(data?.tags) ? data.tags.slice(0, 50).map((t: any) => String(t).slice(0, 60)) : [],
      notes: Array.isArray(data?.notes)
        ? data.notes.slice(0, 200).map((n: any) => ({
            id: String(n?.id || `n_${Date.now()}`),
            date: String(n?.date || new Date().toISOString().slice(0, 10)),
            text: String(n?.text || '').slice(0, 2000),
          })).filter((n: any) => n.text)
        : [],
      vip: !!data?.vip,
      favorite: !!data?.favorite,
    };
    await this.conn.collection('doctor_patient_crm').updateOne(
      { doctor_id: doctorId, patient_id: patientId },
      {
        $set: { data: clean, updatedAt: new Date() },
        $setOnInsert: { id: `crm_${Date.now()}`, doctor_id: doctorId, patient_id: patientId, createdAt: new Date() },
      },
      { upsert: true },
    );
    return clean;
  }

  /** Booking guard: blocked if patient blacklisted by this doctor. */
  async isBlacklisted(doctorId: string, patientId: string): Promise<boolean> {
    return !!(await this.conn.collection('doctor_blacklist').findOne({ doctor_id: doctorId, patient_id: patientId, active: true }));
  }

  // ═══ LAB: QC / STAT / critical / double verification ══════════════════════
  async labQc(user: any, bookingId: string, action: string, body: any = {}) {
    const allowed = ['sample_rejected', 'recollect_requested', 'mark_urgent', 'mark_stat', 'critical_value', 'verify', 'double_verify'];
    if (!allowed.includes(action)) throw new BadRequestException(`action must be one of ${allowed.join(',')}`);
    const b: any = await this.conn.collection('labbookings').findOne({ id: bookingId });
    if (!b) throw new NotFoundException('booking not found');

    const patch: any = { updatedAt: new Date() };
    const hist = { action, at: new Date(), by: user.id, role: user.role, note: body?.note || null };

    switch (action) {
      case 'sample_rejected':
        patch.sample_state = 'rejected';
        patch.sample_reject_reason = body?.reason || 'unsuitable_sample';
        break;
      case 'recollect_requested':
        patch.sample_state = 'recollect_requested';
        patch.state = 'RESCHEDULED';
        break;
      case 'mark_urgent':
        patch.priority = 'urgent';
        break;
      case 'mark_stat':
        patch.priority = 'stat';
        break;
      case 'critical_value':
        patch.critical_value = true;
        patch.critical_note = body?.note || null;
        // Notify doctor + patient immediately (critical value alert)
        await this.notifyUser(b.patient_id, 'نتيجة حرجة من المختبر', 'نتيجة تحليلك تحتاج مراجعة عاجلة — تواصل مع طبيبك.', { booking_id: bookingId, critical: true });
        if (b.doctor_id) await this.notifyUser(b.doctor_id, 'نتيجة حرجة لمريضك', `قيمة حرجة في الحجز ${bookingId}: ${body?.note || ''}`, { booking_id: bookingId, critical: true });
        break;
      case 'verify':
        patch.verified_by = user.id;
        patch.verified_at = new Date();
        patch.verification_state = 'verified';
        break;
      case 'double_verify':
        if (!b.verified_by) throw new BadRequestException('first verification required before double verification');
        patch.double_verified_by = user.id;
        patch.double_verified_at = new Date();
        patch.verification_state = 'double_verified';
        break;
    }
    await this.conn.collection('labbookings').updateOne({ id: bookingId }, { $set: patch, $push: { qc_history: hist } as any });
    // 💰 Final QC (double verify) = results released → credit lab earnings (idempotent per booking)
    if (action === 'double_verify') {
      const fee = Number(b.price ?? b.amount ?? b.total ?? 0);
      const labId = b.lab_id || b.provider_id || user.id;
      await this.creditEarning(labId, 'lab', fee, 'lab_booking', bookingId);
    }
    return { ok: true, action, booking_id: bookingId, state: patch.state || b.state, priority: patch.priority || b.priority };
  }

  private async notifyUser(userId: string, title: string, body: string, data: any) {
    if (!userId) return;
    await this.conn.collection('notifications').insertOne({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId, title_key: title, body_key: body,
      type: 'alert', priority: 'critical', is_read: false, data,
      createdAt: new Date(), updatedAt: new Date(),
    }).catch(() => {});
  }

  // ═══ NURSING: checklists + signature + GPS + escalation ══════════════════
  async nursingChecklist(user: any, bookingId: string, phase: 'before' | 'supplies' | 'after', items: Record<string, boolean>) {
    if (!['before', 'supplies', 'after'].includes(phase)) throw new BadRequestException('phase must be before|supplies|after');
    await this.conn.collection('homecarebookings').updateOne(
      { id: bookingId } as any,
      { $set: { [`checklists.${phase}`]: { items, completed_at: new Date(), by: user.id }, updatedAt: new Date() } },
    );
    return { ok: true, phase, completed: Object.values(items).filter(Boolean).length, total: Object.keys(items).length };
  }

  async nursingSign(user: any, bookingId: string, signatureBase64: string, signerName: string) {
    if (!signatureBase64 || signatureBase64.length < 100) throw new BadRequestException('signature required');
    if (!signerName?.trim()) throw new BadRequestException('signer name required');
    await this.conn.collection('homecarebookings').updateOne(
      { id: bookingId } as any,
      {
        $set: {
          patient_signature: { data_base64: signatureBase64.slice(0, 300000), signer_name: signerName.trim(), signed_at: new Date(), sha256: require('crypto').createHash('sha256').update(signatureBase64).digest('hex') },
          state: 'COMPLETED',
          completed_at: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    // 💰 Credit nurse earnings on signed completion (idempotent per booking)
    const bk: any = await this.conn.collection('homecarebookings').findOne({ id: bookingId } as any);
    const fee = Number(bk?.price ?? bk?.amount ?? bk?.total ?? 0);
    await this.creditEarning(user.id, 'nursing', fee, 'homecare_booking', bookingId);
    return { ok: true, signed: true, signer: signerName.trim(), state: 'COMPLETED' };
  }

  async nursingTrack(user: any, bookingId: string, lat: number, lng: number) {
    if (typeof lat !== 'number' || typeof lng !== 'number') throw new BadRequestException('lat/lng required');
    await this.conn.collection('homecarebookings').updateOne(
      { id: bookingId } as any,
      { $push: { track_points: { lat, lng, at: new Date(), by: user.id } } as any, $set: { updatedAt: new Date() } },
    );
    return { ok: true };
  }

  async nursingEscalate(user: any, bookingId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('reason required');
    await this.conn.collection('homecarebookings').updateOne(
      { id: bookingId } as any,
      { $set: { emergency_escalation: { reason, by: user.id, at: new Date() }, state: 'ESCALATED', updatedAt: new Date() } },
    );
    await this.conn.collection('notifications').insertOne({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: 'admin', title_key: 'تصعيد طارئ من زيارة تمريض',
      body_key: `الزيارة ${bookingId}: ${reason}`, type: 'alert', priority: 'critical', is_read: false,
      data: { booking_id: bookingId, reason }, createdAt: new Date(), updatedAt: new Date(),
    }).catch(() => {});
    return { ok: true, escalated: true };
  }

  // ═══ AMBULANCE: ETA / tracking / handover / completion report ═════════════
  private async ownedAmbulanceMission(user: any, bookingId: string) {
    const role = String(user?.role || '').toLowerCase();
    const admin = role === 'admin' || role === 'super_admin';
    if (!user?.id || (!admin && !['ambulance', 'paramedic', 'ems'].includes(role))) throw new ForbiddenException('ambulance_provider_role_required');
    if (!admin) {
      const account: any = await this.conn.collection('provider_accounts').findOne({
        id: user.id, provider_type: { $in: ['ambulance', 'ems'] }, status: { $in: ['approved', 'active'] },
      });
      if (!account) throw new ForbiddenException('approved_ambulance_account_required');
    }
    const mission: any = await this.conn.collection('emergency_requests').findOne({ id: bookingId } as any);
    if (!mission) throw new NotFoundException('emergency_not_found');
    if (!admin && String(mission.assigned_ambulance_id || '') !== String(user.id)) throw new ForbiddenException('mission_not_assigned_to_ambulance');
    return mission;
  }

  async ambulanceEta(user: any, bookingId: string, fromLat: number, fromLng: number) {
    if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng) || fromLat < -90 || fromLat > 90 || fromLng < -180 || fromLng > 180) throw new BadRequestException('valid_current_location_required');
    const b: any = await this.ownedAmbulanceMission(user, bookingId);
    const dest = b.location || b.patient_location;
    if (!dest?.lat) return { eta_minutes: null, note: 'no destination coordinates' };
    const R = 6371;
    const dLat = (dest.lat - fromLat) * Math.PI / 180;
    const dLng = (dest.lng - fromLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(fromLat * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const km = 2 * R * Math.asin(Math.sqrt(a));
    const eta = Math.max(1, Math.round((km / 40) * 60)); // avg 40km/h urban
    return { eta_minutes: eta, distance_km: Math.round(km * 10) / 10 };
  }

  async ambulanceHandover(user: any, bookingId: string, body: { hospital_provider_account_id: string; notes?: string }) {
    const mission = await this.ownedAmbulanceMission(user, bookingId);
    if (!['DISPATCHED', 'IN_TRANSIT', 'ON_SCENE', 'AT_HOSPITAL'].includes(String(mission.state))) throw new BadRequestException(`invalid_mission_state:${mission.state}`);
    const hospitalId = String(body?.hospital_provider_account_id || '').trim();
    if (!hospitalId) throw new BadRequestException('hospital_provider_account_id_required');
    const hospital: any = await this.conn.collection('provider_accounts').findOne({ id: hospitalId, provider_type: { $in: ['hospital', 'facility'] }, status: { $in: ['approved', 'active'] } });
    if (!hospital) throw new BadRequestException('receiving_hospital_not_approved');
    const now = new Date();
    const handover = { hospital_provider_account_id: hospitalId, notes: String(body?.notes || '').trim() || null, by: user.id, at: now, mission_state_before: mission.state };
    const update = await this.conn.collection('emergency_requests').updateOne(
      { id: bookingId, state: mission.state } as any,
      { $set: { handover, state: 'HANDED_OVER', updatedAt: now }, $push: { state_history: { from: mission.state, to: 'HANDED_OVER', by_user_id: user.id, at: now, reason: 'hospital_handover' } } } as any,
    );
    if (update.modifiedCount !== 1) throw new BadRequestException('mission_transition_conflict');
    await this.conn.collection('audit_logs').insertOne({ id: `ambulance_handover_${bookingId}_${now.getTime()}`, action: 'ambulance_handover', resource_kind: 'emergency_request', resource_id: bookingId, actor_account_id: user.id, purpose: 'clinical_handover', metadata: { hospital_provider_account_id: hospitalId }, createdAt: now });
    return { ok: true, state: 'HANDED_OVER', handover_reference: `handover:${bookingId}:${now.getTime()}` };
  }

  async ambulanceComplete(user: any, bookingId: string, body: { summary: string; outcome: string; vitals?: any }) {
    const mission = await this.ownedAmbulanceMission(user, bookingId);
    if (mission.state !== 'HANDED_OVER') throw new BadRequestException(`invalid_mission_state:${mission.state}`);
    if (!body?.summary || !body?.outcome) throw new BadRequestException('summary_and_outcome_required');
    const now = new Date();
    const update = await this.conn.collection('emergency_requests').updateOne(
      { id: bookingId, state: 'HANDED_OVER' } as any,
      { $set: { completion_report: { summary: String(body.summary).trim(), outcome: String(body.outcome).trim(), vitals: body.vitals || {}, by: user.id, at: now }, state: 'COMPLETED', updatedAt: now }, $push: { state_history: { from: 'HANDED_OVER', to: 'COMPLETED', by_user_id: user.id, at: now, reason: 'mission_completion' } } } as any,
    );
    if (update.modifiedCount !== 1) throw new BadRequestException('mission_transition_conflict');
    // Credit only the server-resolved mission fare; the completion request never supplies an amount.
    const fare = Number(mission.fare ?? mission.amount ?? 0);
    if (!Number.isFinite(fare) || fare < 0) throw new BadRequestException('server_fare_required');
    await this.creditEarning(mission.assigned_ambulance_id, 'ambulance', fare, 'emergency', bookingId);
    await this.conn.collection('audit_logs').insertOne({ id: `ambulance_complete_${bookingId}_${now.getTime()}`, action: 'ambulance_complete', resource_kind: 'emergency_request', resource_id: bookingId, actor_account_id: user.id, purpose: 'clinical_mission_completion', createdAt: now });
    return { ok: true, state: 'COMPLETED' };
  }

  // ═══ FINANCE: invoice PDF + wallet ledger ═════════════════════════════════
  async invoicePdf(orderId: string, requester: any) {
    const o: any = await this.conn.collection('orders').findOne({ id: orderId });
    if (!o) throw new NotFoundException('order not found');
    if (o.patient_id !== requester.id && requester.role !== 'admin' && o.pharmacy_id !== requester.id) throw new BadRequestException('forbidden');
    const svc = new (require('../legal/legal-enterprise.service').LegalEnterpriseService)(this.conn);
    const total = o.total ?? o.totals?.total ?? 0;
    const pdf = svc.buildPdf(`Invoice ${o.id}`, [
      `Date: ${new Date(o.createdAt).toISOString().slice(0, 10)}`,
      `Order: ${o.id}`,
      `Patient: ${o.patient_id}`,
      `State: ${o.state || o.status}`,
      `Total: ${total} SAR`,
      `Commission: ${o.commission ?? 'platform rate'} · VAT 15% on commission`,
      '',
      ...(Array.isArray(o.items) ? o.items : []).slice(0, 30).map((i: any) => `- ${i.name_ar || i.name || i.medicine_id} ×${i.qty || 1} = ${i.price || 0} SAR`),
    ]);
    return pdf;
  }

  /**
   * Toggle the instant-booking availability of the authenticated provider.
   * A missing record intentionally starts offline so availability is never fabricated.
   */
  async toggleInstantAvailability(user: any): Promise<{ instant_available: boolean }> {
    const providerId = typeof user?.id === 'string' ? user.id.trim() : '';
    const providerType = user?.provider_type || user?.providerType;
    const providerRoles = ['doctor', 'facility', 'hospital', 'pharmacy', 'pharmacist', 'lab', 'radiology', 'nursing', 'nurse', 'home_care', 'ambulance'];
    if (!providerId) throw new BadRequestException('provider_id_required');
    if (!providerType && !providerRoles.includes(String(user?.role || '').toLowerCase())) {
      throw new ForbiddenException('provider_account_required');
    }

    const collection = this.conn.collection('provideravailability');
    const existing: any = await collection.findOne({ provider_id: providerId });
    const instantAvailable = !(existing?.instant_available === true);
    await collection.updateOne(
      { provider_id: providerId },
      {
        $set: {
          provider_id: providerId,
          provider_type: providerType || user?.role || null,
          instant_available: instantAvailable,
          updatedAt: new Date(),
        },
        $setOnInsert: { id: `availability_${providerId}`, createdAt: new Date() },
      },
      { upsert: true },
    );
    return { instant_available: instantAvailable };
  }

  // ═══ COMPAT: stats / reviews / settings / consultation-end ═══════════════
  async statsToday(providerId: string): Promise<any> {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const sources = ['doctor_appointments', 'labbookings', 'homecarebookings', 'radiologybookings', 'orders'];
    const idFields = ['doctor_id', 'lab_id', 'provider_id', 'nurse_id', 'radiology_id', 'pharmacy_id'];
    let todayCount = 0, pendingCount = 0;
    for (const coll of sources) {
      try {
        const orConds = idFields.map(f => ({ [f]: providerId, createdAt: { $gte: dayStart } }));
        todayCount += await this.conn.collection(coll).countDocuments({ $or: orConds });
        const pendOr = idFields.map(f => ({ [f]: providerId, state: { $in: ['NEW_REQUEST', 'NEW', 'PENDING', 'REQUESTED', 'BROADCAST'] } }));
        pendingCount += await this.conn.collection(coll).countDocuments({ $or: pendOr });
      } catch { /* collection may not exist */ }
    }
    const ledger = await this.walletLedger(providerId, 500);
    const revenue = ledger.transactions
      .filter((t: any) => t.type === 'provider_earning' && new Date(t.createdAt) >= dayStart)
      .reduce((s: number, t: any) => s + (t.amount || 0), 0);
    return { todayCount, revenue, pendingCount };
  }

  async providerReviews(providerId: string): Promise<any[]> {
    const rows = await this.conn.collection('ratings')
      .find({ $or: [{ provider_id: providerId }, { entity_id: providerId }] })
      .sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((r: any) => ({ ...r, id: r.id || r._id?.toString(), _id: undefined }));
  }

  async replyReview(providerId: string, ratingId: string, reply: string) {
    if (!reply?.trim()) throw new BadRequestException('reply required');
    const own = { $or: [{ provider_id: providerId }, { entity_id: providerId }] };
    let r = await this.conn.collection('ratings').updateOne(
      { id: ratingId, ...own } as any,
      { $set: { reply: reply.trim(), reply_at: new Date() } },
    );
    if (!r.matchedCount) {
      // ratings created without an `id` field — match by Mongo _id
      try {
        const { Types } = require('mongoose');
        if (Types.ObjectId.isValid(ratingId)) {
          r = await this.conn.collection('ratings').updateOne(
            { _id: new Types.ObjectId(ratingId), ...own } as any,
            { $set: { reply: reply.trim(), reply_at: new Date() } },
          );
        }
      } catch { /* invalid ObjectId format */ }
    }
    if (!r.matchedCount) throw new NotFoundException('review not found');
    return { ok: true };
  }

  async getProviderSetting(providerId: string, key: string, def: any): Promise<any> {
    const doc: any = await this.conn.collection('provider_settings').findOne({ provider_id: providerId });
    return doc?.[key] ?? def;
  }

  async setProviderSetting(providerId: string, key: string, value: any) {
    await this.conn.collection('provider_settings').updateOne(
      { provider_id: providerId },
      { $set: { provider_id: providerId, [key]: value, updatedAt: new Date() } },
      { upsert: true },
    );
    return { ok: true };
  }

  async endConsultation(user: any, body: any) {
    const appointmentId = body.appointment_id || body.id;
    if (!appointmentId) throw new BadRequestException('appointment_id required');
    const now = new Date();
    const r = await this.conn.collection('doctor_appointments').updateOne(
      { id: appointmentId },
      {
        $set: { state: 'completed', ended_at: now, updatedAt: now },
        $push: { state_history: { from: 'in_consultation', to: 'completed', by: user.id, at: now } } as any,
      },
    );
    if (!r.matchedCount) throw new NotFoundException('appointment not found');
    // Store consultation notes if provided
    if (body.notes || body.diagnosis) {
      await this.conn.collection('consultationnotes').insertOne({
        id: `note_${Date.now()}`, appointment_id: appointmentId, doctor_id: user.id,
        notes: body.notes || null, diagnosis: body.diagnosis || null, createdAt: now,
      });
    }
    // Store e-prescription if provided
    const appt: any = await this.conn.collection('doctor_appointments').findOne({ id: appointmentId });
    if (Array.isArray(body.prescription) && body.prescription.length) {
      await this.conn.collection('prescriptions').insertOne({
        id: `rx_${Date.now()}`, appointment_id: appointmentId, doctor_id: user.id,
        patient_id: appt?.patient_id || body.patient_id || null,
        items: body.prescription, state: 'CREATED_BY_DOCTOR', createdAt: now,
      });
    }
    // 💰 Credit doctor earnings (gross − commission − VAT) — idempotent per appointment
    const fee = Number(appt?.price ?? appt?.fee ?? appt?.amount ?? body.amount ?? 0);
    await this.creditEarning(user.id, 'doctor', fee, 'appointment', appointmentId);
    return { ok: true, state: 'completed' };
  }

  /** Credit provider earnings on service completion: gross − commission − VAT(15% on commission only).
   *  Idempotent per (ref_type, ref_id) — a completed service can never be double-credited.
   *  E1 S8: enters ESCROW (state 'pending') and matures after the settlement delay. */
  async creditEarning(providerId: string, serviceType: string, gross: number, refType: string, refId: string): Promise<any> {
    if (!providerId || !gross || gross <= 0) return null;
    const dup = await this.conn.collection('platformledgerentries').findOne({ ref_type: refType, ref_id: refId, type: 'provider_earning' });
    if (dup) return dup;
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' });
    const pct = cfg?.service_types?.[serviceType]?.percent ?? 10;
    const vatPct = cfg?.tax?.vat_percent ?? 15;
    const delayDays = cfg?.settlement?.delay_days?.[serviceType] ?? cfg?.settlement?.delay_days?.default ?? 3;
    const commission = Math.round(gross * pct) / 100;
    const vat = Math.round(commission * vatPct) / 100;
    const net = Math.round((gross - commission - vat) * 100) / 100;
    const row = {
      id: `earn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      provider_account_id: providerId,
      type: 'provider_earning', state: 'pending',
      available_at: new Date(Date.now() + delayDays * 24 * 3600 * 1000),
      amount: net, gross, commission_percent: pct, commission, vat,
      ref_type: refType, ref_id: refId, createdAt: new Date(),
    };
    await this.conn.collection('platformledgerentries').insertOne(row as any);
    return row;
  }

  async walletLedger(providerId: string, limit = 100): Promise<any> {
    const rows = await this.conn.collection('platformledgerentries').find(
      { provider_account_id: providerId },
      { projection: { _id: 0 } },
    ).sort({ createdAt: -1 }).limit(Math.min(limit, 200)).toArray();
    const earned = rows.filter((r: any) => r.type === 'provider_earning').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const paid = rows.filter((r: any) => r.type === 'payout').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const pending = rows.filter((r: any) => r.state === 'pending').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    return {
      transactions: rows,
      summary: { earned, paid, pending, balance: Math.max(0, earned - paid) },
    };
  }
}

// ── Controllers ─────────────────────────────────────────────────────────────

@Controller('provider/ops')
@UseGuards(JwtAuthGuard)
export class ProviderOpsController {
  constructor(private readonly svc: ProviderOpsService) {}

  // Doctor: leave/vacation
  @Post('doctor/leave') addLeave(@CurrentUser() u: any, @Body() b: any) { return this.svc.addLeave(u.id, b); }
  @Get('doctor/leave') leaves(@CurrentUser() u: any): Promise<any[]> { return this.svc.myLeaves(u.id); }
  @Delete('doctor/leave/:id') cancelLeave(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelLeave(u.id, id); }

  // Doctor: templates/diagnoses/blacklist
  @Post('doctor/templates') saveTemplate(@CurrentUser() u: any, @Body() b: any) { return this.svc.saveTemplate(u.id, b); }
  @Get('doctor/templates') templates(@CurrentUser() u: any): Promise<any[]> { return this.svc.myTemplates(u.id); }
  @Delete('doctor/templates/:id') delTemplate(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteTemplate(u.id, id); }
  @Post('doctor/diagnoses') saveDx(@CurrentUser() u: any, @Body() b: any) { return this.svc.saveDiagnosis(u.id, b); }
  @Get('doctor/diagnoses') diagnoses(@CurrentUser() u: any, @Query('search') s?: string): Promise<any[]> { return this.svc.myDiagnoses(u.id, s); }
  @Post('doctor/blacklist/:patientId') block(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.blacklistPatient(u.id, p, b?.reason); }
  @Delete('doctor/blacklist/:patientId') unblock(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.unblacklistPatient(u.id, p); }
  @Get('doctor/blacklist') blacklist(@CurrentUser() u: any): Promise<any[]> { return this.svc.myBlacklist(u.id); }
  @Get('doctor/patient-crm/:patientId') getCrm(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.getPatientCrm(u.id, p); }
  @Put('doctor/patient-crm/:patientId') putCrm(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.putPatientCrm(u.id, p, b || {}); }

  // Lab QC
  @Post('lab/bookings/:id/qc/:action') qc(@CurrentUser() u: any, @Param('id') id: string, @Param('action') action: string, @Body() b: any) { return this.svc.labQc(u, id, action, b); }

  // Nursing
  @Post('nursing/bookings/:id/checklist/:phase') checklist(@CurrentUser() u: any, @Param('id') id: string, @Param('phase') phase: string, @Body() b: any) { return this.svc.nursingChecklist(u, id, phase as any, b?.items || {}); }
  @Post('nursing/bookings/:id/sign') sign(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingSign(u, id, b?.signature, b?.signer_name); }
  @Post('nursing/bookings/:id/track') track(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingTrack(u, id, b?.lat, b?.lng); }
  @Post('nursing/bookings/:id/escalate') escalate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingEscalate(u, id, b?.reason); }

  // Ambulance
  @Get('ambulance/:id/eta') eta(@CurrentUser() u: any, @Param('id') id: string, @Query('lat') lat: string, @Query('lng') lng: string) { return this.svc.ambulanceEta(u, id, parseFloat(lat), parseFloat(lng)); }
  @Post('ambulance/:id/handover') handover(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.ambulanceHandover(u, id, b); }
  @Post('ambulance/:id/complete') complete(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.ambulanceComplete(u, id, b); }

  // Finance
  @Get('invoice/:orderId/pdf') async invoice(@CurrentUser() u: any, @Param('orderId') id: string, @Res({ passthrough: true }) res: any) {
    const pdf = await this.svc.invoicePdf(id, u);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="invoice-${id}.pdf"` });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(pdf));
  }
  @Get('wallet/ledger') wallet(@CurrentUser() u: any, @Query('limit') l?: string): Promise<any> { return this.svc.walletLedger(u.id, l ? parseInt(l) : 100); }
}

// ── Compat endpoints: routes the provider app calls that had no backend ─────

@Controller('provider')
@UseGuards(JwtAuthGuard)
export class ProviderCompatController {
  constructor(private readonly svc: ProviderOpsService) {}

  /** Availability is explicit operational state, never a UI default. */
  @Post('ops/availability/toggle-instant')
  toggleInstantAvailability(@CurrentUser() u: any) {
    return this.svc.toggleInstantAvailability(u);
  }

  /** Wallet summary — shape the app expects: { available, escrow, dues, earned } */
  @Get('wallet') async wallet(@CurrentUser() u: any) {
    const l = await this.svc.walletLedger(u.id, 500);
    return { available: l.summary.balance, escrow: l.summary.pending, dues: l.summary.earned - l.summary.paid - l.summary.pending, earned: l.summary.earned };
  }

  @Get('wallet/transactions') async walletTx(@CurrentUser() u: any) {
    const l = await this.svc.walletLedger(u.id, 100);
    return l.transactions.map((t: any) => ({
      id: t.id || t._id,
      date: (t.createdAt || '').toString().slice(0, 10),
      type: t.type === 'payout' || (t.amount || 0) < 0 ? 'DEBIT' : 'CREDIT',
      amount: Math.abs(t.amount || 0),
      title: t.description || t.title || t.type,
    }));
  }

  /** Today's stats — shape: { todayCount, revenue, pendingCount } */
  @Get('stats/today') async statsToday(@CurrentUser() u: any): Promise<any> {
    return this.svc.statsToday(u.id);
  }

  /** Reviews received by this provider */
  @Get('reviews') async myReviews(@CurrentUser() u: any): Promise<any[]> {
    return this.svc.providerReviews(u.id);
  }

  @Post('reviews/:id/reply') replyReview(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.replyReview(u.id, id, b?.reply);
  }

  /** Working hours get/set */
  @Get('working-hours') async getHours(@CurrentUser() u: any) {
    return this.svc.getProviderSetting(u.id, 'working_hours', null);
  }
  @Put('working-hours') async putHours(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.setProviderSetting(u.id, 'working_hours', b?.hours ?? b);
  }

  /** Schedule settings (nursing/providers): shifts, maxVisits, emergencyReady */
  @Get('schedule/settings') async getSched(@CurrentUser() u: any) {
    return this.svc.getProviderSetting(u.id, 'schedule_settings', null);
  }
  @Post('schedule/settings') async postSched(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.setProviderSetting(u.id, 'schedule_settings', b || {});
  }

  /** End a consultation: complete appointment + store notes/prescription */
  @Post('consultation/end') endConsultation(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.endConsultation(u, b || {});
  }
}

@Module({
  controllers: [ProviderOpsController, ProviderCompatController],
  providers: [ProviderOpsService],
  exports: [ProviderOpsService],
})
export class ProviderOpsModule {}
