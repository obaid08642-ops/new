/**
 * PROVIDER PRODUCTION MODULE (P3) — الـ9 endpoints الحاكمة لمصفوفة سيناريوهات المزوّدين
 *
 * 1.  POST   /orders/:id/insurance-decision          قرار بنود الصيدلية (per-item)
 * 2.  POST   /labs/bookings/:id/coverage-decision    قرار تغطية (نمط D)
 * 3.  POST   /radiology/bookings/:id/coverage-decision
 * 4.  POST   /home-care/bookings/:id/coverage-decision  (تمريض)
 * 5.  GET    /provider/crm/:patientId                CRM persistence حقيقي
 * 6.  POST   /provider/crm/:patientId
 * 7.  GET    /provider/referrals/mine                تتبع الإحالات
 * 8.  CRUD   /hospital/staff-roster/technicians      قائمة الفنيين
 * 9.  CRUD   /facility/shifts                        الشيفتات (PATCH/DELETE يكمل القائم)
 * 10. POST   /claims/:id/{resubmit|approve|reject}   أفعال مطالبات المنشأة
 * 11. GET    /provider/reports/inbound               التقارير الواردة الحقيقية
 * 12. PATCH  /provider/profile/availability          round-trip كامل
 */
import {
  Module, Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, UseGuards,
  ForbiddenException, BadRequestException, NotFoundException, Injectable,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { randomUUID } from 'crypto';

/** Provider-scope roles allowed to act on these surfaces (with alias normalization). */
const PROVIDER_ROLES = [
  UserRole.DOCTOR, UserRole.LAB, UserRole.RADIOLOGY, UserRole.NURSE,
  UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.ADMIN,
];
const ROLE_ALIASES: Record<string, string> = {
  nursing: 'nurse', nurse: 'nurse',
  laboratory: 'lab', home_care: 'nurse', homecare: 'nurse',
  pharmacist: 'pharmacy', hospital: 'hospital', facility: 'hospital',
};
function assertProviderRole(user: any) {
  const raw = String(user?.role || '').toLowerCase();
  const normalized = ROLE_ALIASES[raw] || raw;
  if (!normalized || !PROVIDER_ROLES.includes(normalized as UserRole)) {
    throw new ForbiddenException('provider_scope_required');
  }
}
function isAdmin(user: any) { return user?.role === UserRole.ADMIN || user?.role === 'super_admin'; }

/** Map a shared insurance decision onto booking mirror fields (نمط D).
 *  Radiology enum lacks a partial value — partial mirrors as approved with copay. */
function decisionToMirror(decision: string, kind?: string) {
  if (kind === 'radiology') {
    const radMap: Record<string, string> = {
      APPROVED_FULL: 'approved',
      APPROVED_PARTIAL: 'approved', // copay_amount carries the patient share
      REJECTED: 'rejected',
    };
    return radMap[decision] || 'pending';
  }
  const map: Record<string, string> = {
    APPROVED_FULL: 'approved',
    APPROVED_PARTIAL: 'partial_approval',
    REJECTED: 'rejected',
  };
  return map[decision] || 'pending';
}

@Injectable()
export class ProviderProductionService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private async assertApprovedOperationalAccount(user: any, acceptedTypes: string[]) {
    assertProviderRole(user);
    if (isAdmin(user)) return;
    const account: any = await this.conn.collection('provider_accounts').findOne({
      id: user?.id,
      provider_type: { $in: acceptedTypes },
      status: { $in: ['approved', 'active'] },
    });
    if (!account) throw new ForbiddenException('approved_provider_account_required');
  }

  // ═══ 1. PHARMACY: per-item insurance decision on a legacy order ═══
  async orderInsuranceDecision(user: any, orderId: string, body: any) {
    assertProviderRole(user);
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      throw new BadRequestException('items_required');
    }
    const orders = this.conn.collection('orders');
    const order: any = await orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');
    if (!isAdmin(user) && String(order.pharmacy_id) !== String(user.id)) {
      throw new ForbiddenException('order_not_owned');
    }
    if (!['PENDING_INSURANCE', 'BASKET_REVIEW', 'ACCEPTED', 'PHARMACY_RECEIVED', 'VALIDATED'].includes(String(order.state))) {
      throw new BadRequestException(`invalid_state:${order.state}`);
    }

    let approvedCount = 0; let rejectedCount = 0;
    const applied: any[] = [];
    for (const dec of body.items) {
      const item = (order.items || []).find((i: any) => i.id === dec.item_id || String(i._id) === String(dec.item_id));
      if (!item) { rejectedCount++; continue; }
      const patch: any = {};
      if (dec.decision === 'approved') { patch.isCovered = true; patch.rejectReason = null; approvedCount++; }
      else if (dec.decision === 'alternative') { patch.isCovered = false; patch.rejectReason = `alternative:${dec.alternative_item_id || ''}`; approvedCount++; }
      else { patch.isCovered = false; patch.rejectReason = String(dec.reject_reason || 'not_covered'); rejectedCount++; }
      await orders.updateOne(
        { id: orderId, 'items.id': item.id },
        { $set: Object.fromEntries(Object.entries(patch).map(([k, v]) => [`items.$.${k}`, v])) } as any,
      );
      applied.push({ item_id: item.id, ...patch });
    }

    const status = approvedCount === 0 ? 'REJECTED' : rejectedCount > 0 ? 'PARTIAL' : 'APPROVED';
    const copayPercent = Math.min(100, Math.max(0, Number(body.copay_percent ?? 0)));
    const total = Number(order.total ?? order.total_amount ?? 0);
    const insurerShare = body.insurer_share != null
      ? Math.max(0, Number(body.insurer_share))
      : Math.max(0, Math.round(total * (1 - copayPercent / 100) * 100) / 100);
    const patientShare = Math.max(0, total - insurerShare);

    const now = new Date();
    await orders.updateOne({ id: orderId }, {
      $set: {
        state: status === 'APPROVED' || status === 'PARTIAL' ? 'PENDING_INSURANCE' : 'PENDING_INSURANCE',
        insurance_status: status === 'PARTIAL' ? 'PARTIAL_APPROVAL' : status,
        'insurance_details.approvalStatus': status,
        'insurance_details.items': applied,
        'insurance_details.copay_percent': copayPercent,
        'insurance_details.insurer_share': insurerShare,
        'insurance_details.patient_share': patientShare,
        'insurance_details.nphies_approval_code': body.nphies_approval_code || null,
        'insurance_details.policy_number': body.policy_number || null,
        'insurance_details.member_id': body.member_id || null,
        'insurance_details.decided_by': user.id,
        'insurance_details.decided_at': now,
        updatedAt: now,
      },
      $push: { state_history: { from: order.state, to: 'PENDING_INSURANCE', at: now, by_user_id: user.id, by_role: user.role, note: `insurance-decision:${status}` } } as any,
    });

    return {
      ok: true,
      insurance_status: status === 'PARTIAL' ? 'PARTIAL' : status,
      copay_amount: patientShare,
      patient_share: patientShare,
      insurer_share: insurerShare,
      waiting_state: 'WAITING_COPAY',
      items: applied,
    };
  }

  // ═══ 2-4. LABS/RADIOLOGY/HOMECARE coverage decision (نمط D) ═══
  private async bookingCoverageDecision(user: any, kind: 'lab' | 'radiology' | 'nursing', bookingId: string, body: any) {
    await this.assertApprovedOperationalAccount(user, kind === 'lab' ? ['lab', 'laboratory'] : kind === 'radiology' ? ['radiology'] : ['nursing', 'home_care', 'homecare']);
    const decision = body?.decision;
    if (!['APPROVED_FULL', 'APPROVED_PARTIAL', 'REJECTED'].includes(decision)) {
      throw new BadRequestException('decision must be APPROVED_FULL | APPROVED_PARTIAL | REJECTED');
    }
    const collection = kind === 'lab' ? 'labbookings' : kind === 'radiology' ? 'radiologybookings' : 'homecarebookings';
    const col = this.conn.collection(collection);
    const b: any = await col.findOne({ id: bookingId });
    if (!b) throw new NotFoundException('booking_not_found');
    if (!isAdmin(user) && b.provider_account_id && b.provider_account_id !== user.id) {
      throw new ForbiddenException('booking_not_owned');
    }
    if (!['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(String(b.state))) {
      throw new BadRequestException(`invalid_state:${b.state}`);
    }
    const reason = String(body?.reason || '').trim();
    const decisionReference = String(body?.decision_reference || body?.approval_code || '').trim();
    if (decision === 'REJECTED' && !reason) throw new BadRequestException('rejection_reason_required');
    if (decision !== 'REJECTED' && !decisionReference) throw new BadRequestException('manual_decision_reference_required');

    const copayPercent = decision === 'APPROVED_PARTIAL'
      ? Math.min(99, Math.max(1, Number(body.copay_percent ?? 0)))
      : decision === 'APPROVED_FULL' ? 0 : undefined;
    if (decision === 'APPROVED_PARTIAL' && !copayPercent) throw new BadRequestException('copay_percent_required_for_partial_approval');
    // Only a server-created booking price snapshot may be used. A request body never supplies the amount.
    const price = Number(b.pricing_snapshot?.total ?? b.server_total ?? b.total ?? b.price);
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException('server_price_snapshot_required');
    const copayAmount = copayPercent != null ? Math.round(price * (copayPercent / 100) * 100) / 100 : 0;

    const now = new Date();
    const mirrorStatus = decisionToMirror(decision, kind);
    const nextState = decision === 'APPROVED_FULL' ? 'CONFIRMED' : decision === 'APPROVED_PARTIAL' ? 'WAITING_COPAY' : 'INSURANCE_REJECTED';
    await col.updateOne({ id: bookingId }, {
      $set: {
        state: nextState,
        insurance_status: mirrorStatus,
        insurance_copay_amount: copayAmount,
        ...(copayPercent != null ? { insurance_copay_percent: copayPercent } : {}),
        ...(decisionReference ? { insurance_approval_code: decisionReference } : {}),
        ...(decision === 'REJECTED' ? { insurance_rejection_reason: reason } : {}),
        insurance_decision: {
          kind: 'manual_internal', decision, decision_reference: decisionReference || null, reason: reason || null,
          price_snapshot: price, copay_percent: copayPercent ?? null, copay_amount: copayAmount,
          decided_by: user.id, decided_at: now,
        },
        updatedAt: now,
      },
      $push: {
        state_history: {
          from: b.state, to: nextState, at: now, by_user_id: user.id, by_role: user.role,
          note: `coverage-decision:${decision}${copayPercent != null ? `:copay_${copayPercent}%` : ''}`,
        },
      } as any,
    });
    this.emitSafe('insurance.booking.coverage_decided', { booking_kind: kind, booking_id: bookingId, decision, copay_amount: copayAmount, patient_id: b.patient_id });

    return {
      ok: true,
      booking_id: bookingId,
      insurance_status: mirrorStatus === 'partial_approval' ? 'PARTIAL_APPROVAL' : mirrorStatus.toUpperCase(),
      next_state: nextState,
      copay_amount: copayAmount,
    };
  }

  labCoverageDecision(user: any, id: string, body: any) { return this.bookingCoverageDecision(user, 'lab', id, body); }
  radiologyCoverageDecision(user: any, id: string, body: any) { return this.bookingCoverageDecision(user, 'radiology', id, body); }
  homecareCoverageDecision(user: any, id: string, body: any) { return this.bookingCoverageDecision(user, 'nursing', id, body); }

  private emitSafe(event: string, payload: any) {
    try { (this.conn as any).emit?.(event, payload); } catch { /* events optional */ }
  }

  // ═══ 5-6. CRM persistence (exact governed paths) ═══
  async listCrmPatients(user: any) {
    assertProviderRole(user);
    const records = await this.conn.collection('doctor_patient_crm')
      .find({ owner_id: user.id }, { projection: { _id: 0, patient_id: 1, data: 1, updatedAt: 1 } })
      .sort({ updatedAt: -1 }).limit(200).toArray();
    const patientIds = records.map((record: any) => String(record.patient_id)).filter(Boolean);
    const patients = patientIds.length
      ? await this.conn.collection('users').find({ id: { $in: patientIds } }, { projection: { _id: 0, id: 1, full_name: 1, name: 1, phone: 1 } }).toArray()
      : [];
    const names = new Map(patients.map((patient: any) => [String(patient.id), patient.full_name || patient.name || patient.phone || '']));
    return records.map((record: any) => ({
      patient_id: String(record.patient_id),
      name: names.get(String(record.patient_id)) || '',
      is_vip: Boolean(record.data?.vip),
      is_favorite: Boolean(record.data?.favorite),
      is_blocked: Boolean(record.data?.blocked),
      updated_at: record.updatedAt || null,
    }));
  }
  async getCrm(user: any, patientId: string) {
    assertProviderRole(user);
    const doc: any = await this.conn.collection('doctor_patient_crm').findOne(
      { owner_id: user.id, patient_id: patientId },
      { projection: { _id: 0 } },
    );
    if (!doc) throw new NotFoundException('crm_record_not_found');
    return doc.data || {};
  }

  async putCrm(user: any, patientId: string, data: any) {
    assertProviderRole(user);
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
      blocked: !!data?.blocked,
      blocked_reason: data?.blocked ? String(data?.blocked_reason || '').slice(0, 500) : '',
    };
    await this.conn.collection('doctor_patient_crm').updateOne(
      { owner_id: user.id, patient_id: patientId },
      {
        $set: { data: clean, updatedAt: new Date() },
        $setOnInsert: { id: `crm_${Date.now()}`, owner_id: user.id, patient_id: patientId, createdAt: new Date() },
      },
      { upsert: true },
    );
    return clean;
  }

  // ═══ 7. Referral tracking (mine) ═══
  async myReferrals(user: any) {
    assertProviderRole(user);
    const rows: any[] = [];
    // (a) outbound feature referrals issued by this doctor/provider account
    const outbound = await this.conn.collection('outbound_referrals')
      .find({ referrer_doctor_id: user.id }).sort({ createdAt: -1 }).limit(100).toArray();
    for (const r of outbound) {
      rows.push({
        id: r.id || String(r._id),
        patient_name: r.patient_name || '',
        target_type: r.target_type || '',
        target_name: r.target_name || '',
        tests_summary: Array.isArray(r.requested_tests) ? r.requested_tests.join(', ') : (r.notes || ''),
        status: r.status || 'pending',
        created_at: r.createdAt || r.created_at || null,
      });
    }
    // (b) engine referrals (doctor_referrals collection keyed by the users _id or id)
    const me: any = await this.conn.collection('users').findOne({ id: user.id }, { projection: { _id: 1 } });
    const ids = [user.id, ...(me?._id ? [String(me._id)] : [])];
    const engine = await this.conn.collection('doctorreferrals')
      .find({ $or: [{ doctor_id: { $in: ids } }, { referring_doctor_id: { $in: ids } }] })
      .sort({ createdAt: -1 }).limit(100).toArray();
    for (const r of engine) {
      const returned = !!(r.diagnostic_results_returned);
      rows.push({
        id: String(r._id),
        patient_name: r.patient_name || '',
        target_type: r.requested_radiology_scans?.length && r.requested_lab_tests?.length ? 'both'
          : r.requested_radiology_scans?.length ? 'radiology'
          : r.requested_lab_tests?.length ? 'lab' : 'home_care',
        target_name: r.target_facility_name || '',
        tests_summary: [...(r.requested_lab_tests || []), ...(r.requested_radiology_scans || [])].join(', '),
        status: returned ? 'completed' : 'pending',
        created_at: r.createdAt || null,
      });
    }
    return rows;
  }

  async createReferral(user: any, body: any) {
    assertProviderRole(user);
    const role = ROLE_ALIASES[String(user?.role || '').toLowerCase()] || String(user?.role || '').toLowerCase();
    if (!isAdmin(user) && role !== UserRole.DOCTOR) throw new ForbiddenException('doctor_scope_required');
    const patientId = String(body?.patient_id || '').trim();
    const targetType = String(body?.target_type || '').trim().toLowerCase();
    if (!patientId || !['lab', 'radiology', 'nursing'].includes(targetType) || !String(body?.notes || '').trim()) {
      throw new BadRequestException('patient_target_and_notes_required');
    }

    const patient: any = await this.conn.collection('users').findOne({ id: patientId });
    if (!patient || String(patient.role || '').toLowerCase() !== 'patient') {
      throw new NotFoundException('patient_not_found');
    }

    const appointmentId = String(body?.appointment_id || '').trim();
    if (appointmentId) {
      const appointment: any = await this.conn.collection('appointments').findOne({ $or: [{ id: appointmentId }, { appointment_id: appointmentId }] });
      if (!appointment) throw new NotFoundException('appointment_not_found');
      const appointmentPatientId = appointment.patient_id || appointment.patientId || appointment.user_id;
      if (!appointmentPatientId || String(appointmentPatientId) !== patientId) throw new ForbiddenException('appointment_patient_mismatch');
      const appointmentProviderIds = [appointment.doctor_id, appointment.provider_id, appointment.provider_account_id, appointment.doctor_user_id]
        .filter(Boolean).map(String);
      if (!isAdmin(user) && !appointmentProviderIds.includes(String(user.id))) throw new ForbiddenException('appointment_not_owned');
    }

    const targetProviderId = String(body?.target_provider_id || body?.destination_provider_id || '').trim();
    let targetName = String(body?.target_name || '').trim();
    if (targetProviderId) {
      const targetProfile: any = await this.conn.collection('provider_profiles').findOne({ account_id: targetProviderId });
      const profileType = String(targetProfile?.type || targetProfile?.provider_type || '').toLowerCase();
      if (!targetProfile || profileType !== targetType) throw new BadRequestException('invalid_referral_destination');
      const targetAccount: any = await this.conn.collection('provider_accounts').findOne({ id: targetProviderId, status: { $in: ['approved', 'active'] } });
      if (!targetAccount) throw new BadRequestException('inactive_referral_destination');
      targetName = targetProfile.display_name_ar || targetProfile.business_name || targetProfile.display_name_en || targetName;
    }

    const now = new Date();
    const row = {
      id: randomUUID(),
      referrer_doctor_id: user.id,
      appointment_id: appointmentId || null,
      patient_id: patientId,
      patient_name: patient.full_name || patient.name || patient.name_ar || patient.name_en || '',
      target_type: targetType,
      target_provider_id: targetProviderId || null,
      target_name: targetName,
      requested_tests: Array.isArray(body.requested_tests) ? body.requested_tests.slice(0, 50).map(String) : [],
      referral_code: `REF-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      notes: String(body.notes).trim(),
      urgent: Boolean(body.urgent),
      status: 'pending',
      created_at: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.conn.collection('outbound_referrals').insertOne(row as any);
    return { ...row, _id: undefined };
  }
  async referralNetwork(user: any) {
    assertProviderRole(user);
    const profiles = await this.conn.collection('provider_profiles')
      .find({ $or: [{ type: { $in: ['lab', 'radiology'] } }, { provider_type: { $in: ['lab', 'radiology'] } }] }, { projection: { _id: 0, account_id: 1, type: 1, provider_type: 1, business_name: 1, display_name_ar: 1, display_name_en: 1 } })
      .limit(200).toArray();
    const accountIds = profiles.map((profile: any) => String(profile.account_id)).filter(Boolean);
    const accounts = accountIds.length
      ? await this.conn.collection('provider_accounts').find({ id: { $in: accountIds }, status: { $in: ['approved', 'active'] } }, { projection: { _id: 0, id: 1 } }).toArray()
      : [];
    const activeAccounts = new Set(accounts.map((account: any) => String(account.id)));
    return profiles.filter((profile: any) => activeAccounts.has(String(profile.account_id))).map((profile: any) => ({
      id: String(profile.account_id),
      name: profile.display_name_ar || profile.business_name || profile.display_name_en || '',
      name_en: profile.display_name_en || profile.business_name || profile.display_name_ar || '',
      type: profile.type || profile.provider_type,
    }));
  }
  async listPromotions(user: any): Promise<any[]> {
    assertProviderRole(user);
    return this.conn.collection('promotioncampaigns')
      .find({ $or: [{ provider_account_id: user.id }, { provider_id: user.id }] }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 }).limit(100).toArray();
  }
  async createPromotion(user: any, body: any) {
    assertProviderRole(user);
    if (!String(body?.title_ar || body?.title_en || '').trim()) throw new BadRequestException('promotion_title_required');
    const original = Number(body?.original_price);
    const discounted = Number(body?.discounted_price);
    if (!Number.isFinite(original) || !Number.isFinite(discounted) || original < 0 || discounted < 0 || discounted > original) {
      throw new BadRequestException('invalid_promotion_prices');
    }
    const start = new Date(body?.start_date);
    const end = new Date(body?.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new BadRequestException('invalid_promotion_dates');
    const now = new Date();
    const row = {
      id: randomUUID(), provider_account_id: user.id, provider_id: user.id,
      title_ar: String(body?.title_ar || '').trim(), title_en: String(body?.title_en || '').trim(),
      original_price: original, discounted_price: discounted, start_date: start, end_date: end,
      target_parameters: body?.target_parameters || {}, status: 'pending_review', createdAt: now, updatedAt: now,
    };
    await this.conn.collection('promotioncampaigns').insertOne(row as any);
    return { ...row, _id: undefined };
  }
  // ═══ 8. Technician roster CRUD ═══
  private async technicianCollection() { return this.conn.collection('technician_roster'); }

  async listTechnicians(user: any): Promise<any[]> {
    assertProviderRole(user);
    const q: any = { owner_account_id: user.id };
    if (isAdmin(user)) delete q.owner_account_id;
    return this.conn.collection('technician_roster').find(q, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  async createTechnician(user: any, body: any) {
    assertProviderRole(user);
    if (!body?.full_name?.trim() || !body?.phone?.trim()) throw new BadRequestException('full_name_phone_required');
    const col = await this.technicianCollection();
    const dup = await col.findOne({ owner_account_id: user.id, phone: body.phone.trim() });
    if (dup) throw new BadRequestException('technician_exists');
    const doc = {
      id: `tech_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
      owner_account_id: user.id,
      full_name: String(body.full_name).trim().slice(0, 120),
      phone: String(body.phone).trim(),
      department: body.department ? String(body.department).slice(0, 80) : undefined,
      specialty: body.specialty ? String(body.specialty).slice(0, 80) : undefined,
      suspended: false,
      createdAt: new Date(),
    };
    await col.insertOne(doc as any);
    const { _id, ...out } = doc as any;
    return out;
  }

  async updateTechnician(user: any, techId: string, body: any) {
    assertProviderRole(user);
    const col = await this.technicianCollection();
    const t: any = await col.findOne({ id: techId });
    if (!t) throw new NotFoundException('technician_not_found');
    if (!isAdmin(user) && t.owner_account_id !== user.id) throw new ForbiddenException('not_owner');
    const patch: any = {};
    for (const k of ['full_name', 'phone', 'department', 'specialty']) if (body?.[k] !== undefined) patch[k] = String(body[k]).slice(0, 120);
    if (body?.suspended !== undefined) patch.suspended = !!body.suspended;
    await col.updateOne({ id: techId }, { $set: { ...patch, updatedAt: new Date() } });
    const updated: any = await col.findOne({ id: techId }, { projection: { _id: 0 } });
    return updated;
  }

  async deleteTechnician(user: any, techId: string) {
    assertProviderRole(user);
    const col = await this.technicianCollection();
    const t: any = await col.findOne({ id: techId });
    if (!t) throw new NotFoundException('technician_not_found');
    if (!isAdmin(user) && t.owner_account_id !== user.id) throw new ForbiddenException('not_owner');
    await col.deleteOne({ id: techId });
    return { ok: true };
  }

  // ═══ 9. Facility shifts — full CRUD handled in facility-ops (PATCH/DELETE added there) ═══

  // ═══ 10. Claim actions ═══
  async claimAction(user: any, claimId: string, action: 'resubmit' | 'approve' | 'reject', body: any) {
    assertProviderRole(user);
    const col = this.conn.collection('insurance_claims');
    const claim: any = await col.findOne({ id: claimId });
    if (!claim) throw new NotFoundException('claim_not_found');

    const statusMap: Record<string, string> = { resubmit: 'pending', approve: 'approved', reject: 'rejected' };
    const nextStatus = statusMap[action];

    if (action === 'reject' && !String(body?.reason || '').trim()) {
      throw new BadRequestException('rejection reason is required');
    }
    // Ownership: admin always; otherwise resolve the actor's facility linkage
    // from the DB (JWTs do not carry parent_provider_account_id).
    if (!isAdmin(user)) {
      const me: any = await this.conn.collection('users').findOne({ id: user.id }, { projection: { parent_provider_account_id: 1, facility_id: 1 } });
      const myFacility = me?.parent_provider_account_id || me?.facility_id || user.facility_id || user.parent_provider_account_id;
      const claimFacility = claim.facility_account_id || claim.provider_account_id;
      if (!(myFacility && claimFacility && String(myFacility) === String(claimFacility))) {
        throw new ForbiddenException('claim_not_owned');
      }
    }
    if (action === 'approve' && !['pending', 'resubmitted'].includes(String(claim.status))) {
      throw new BadRequestException(`invalid_claim_status:${claim.status}`);
    }
    await col.updateOne({ id: claimId }, {
      $set: { status: nextStatus, updatedAt: new Date(), last_action: action, last_action_by: user.id, last_action_at: new Date() },
      $push: {
        history: {
          action, by: user.id, role: user.role, at: new Date(),
          reason: action === 'reject' ? String(body.reason).trim() : undefined,
          documents: action === 'resubmit' ? (body.updated_documents || []) : undefined,
        },
      } as any,
    });
    const updated: any = await col.findOne({ id: claimId }, { projection: { _id: 0 } });
    return { ok: true, claim_id: claimId, claim_status: nextStatus.toUpperCase(), acted_by: user.id, acted_at: new Date().toISOString(), claim: updated };
  }

  // ═══ 11. Inbound reports (real diagnostic results routed back to this doctor) ═══
  async inboundReports(user: any) {
    assertProviderRole(user);
    const me: any = await this.conn.collection('users').findOne({ id: user.id }, { projection: { _id: 1 } });
    const ids = [user.id, ...(me?._id ? [String(me._id)] : [])];

    // Radiology bookings referred by me that reached report stages.
    const rad = await this.conn.collection('radiologybookings')
      .find({
        $or: [{ referring_doctor_id: { $in: ids } }, { referrer_doctor_id: { $in: ids } }],
        state: { $in: ['REPORT_DRAFT', 'UNDER_REVIEW', 'REPORT_READY', 'REPORT_PUBLISHED'] },
      })
      .sort({ updatedAt: -1 }).limit(50)
      .project({ _id: 0, id: 1, state: 1, patient_name: 1, scan_name_ar: 1, scan_name_en: 1, report_pdf_url: 1, published_at: 1, createdAt: 1 })
      .toArray();

    // Lab bookings with uploaded reports referred by me.
    const lab = await this.conn.collection('labbookings')
      .find({ referring_doctor_id: { $in: ids }, reports: { $exists: true, $ne: [] } })
      .sort({ updatedAt: -1 }).limit(50)
      .toArray();

    const labRows = lab.map((b: any) => {
      const lastReport = (b.reports || [])[(b.reports || []).length - 1] || {};
      return {
        id: `lab-${b.id}-${lastReport.id || 'r'}`,
        kind: 'LAB' as const,
        booking_id: b.id,
        patient_name: b.patient_name || '',
        test_name: (b.items || []).map((i: any) => i.service_name_ar || i.service_name_en || i.name_en || i.name || '').filter(Boolean).join(', ') || (b.test_name || ''),
        status: b.state === 'REPORTED' ? 'REPORTED' : 'RESULT_UPLOADED',
        report_url: lastReport.url || `/api/v1/storage/${lastReport.url || ''}`,
        dicom_viewer_url: null,
        published_at: lastReport.uploaded_at || null,
        created_at: lastReport.uploaded_at || b.createdAt || null,
      };
    });

    const radRows = rad.map((b: any) => ({
      id: `rad-${b.id}`,
      kind: 'RADIOLOGY' as const,
      booking_id: b.id,
      patient_name: b.patient_name || '',
      test_name: b.scan_name_ar || b.scan_name_en || '',
      status: b.state,
      report_url: b.report_pdf_url || null,
      dicom_viewer_url: null,
      published_at: b.published_at || null,
      created_at: b.createdAt || null,
    }));

    return [...radRows, ...labRows].sort((a: any, b: any) =>
      new Date(b.published_at || b.created_at || 0).getTime() - new Date(a.published_at || a.created_at || 0).getTime());
  }

  // ═══ 12. Availability round-trip ═══
    async getAvailability(user: any) {
    assertProviderRole(user);
    const account: any = await this.conn.collection('provider_accounts').findOne(
      { id: user.id },
      { projection: { _id: 0, availability: 1 } },
    );
    if (!account) throw new NotFoundException('provider_account_not_found');
    return account.availability ?? null;
  }
  async patchAvailability(user: any, body: any): Promise<any> {
    assertProviderRole(user);
    const allowedKeys = ['is_accepting_requests', 'instant_available', 'instant_available_minutes', 'vacation_mode', 'vacation_from', 'vacation_to', 'weekly_schedule', 'availability_exceptions'];
    const patch: any = {};
    for (const key of allowedKeys) if (body?.[key] !== undefined) patch[key] = body[key];
    if (!Object.keys(patch).length) throw new BadRequestException('no_mutable_availability_fields');
    if (patch.weekly_schedule !== undefined && !Array.isArray(patch.weekly_schedule)) {
      throw new BadRequestException('weekly_schedule_must_be_array');
    }
    if (patch.availability_exceptions !== undefined && !Array.isArray(patch.availability_exceptions)) {
      throw new BadRequestException('availability_exceptions_must_be_array');
    }
    if (patch.instant_available_minutes !== undefined && (!Number.isInteger(patch.instant_available_minutes) || patch.instant_available_minutes < 1 || patch.instant_available_minutes > 120)) {
      throw new BadRequestException('instant_available_minutes_must_be_integer_between_1_and_120');
    }
    const account: any = await this.conn.collection('provider_accounts').findOne(
      { id: user.id },
      { projection: { _id: 0, availability: 1 } },
    );
    if (!account) throw new NotFoundException('provider_account_not_found');
    const availability = { ...(account.availability || {}), ...patch };
    await this.conn.collection('provider_accounts').updateOne(
      { id: user.id },
      { $set: { availability, availability_updated_at: new Date(), updatedAt: new Date() } },
    );
    const back: any = await this.conn.collection('provider_accounts').findOne(
      { id: user.id },
      { projection: { _id: 0, availability: 1 } },
    );
    if (!back || JSON.stringify(back.availability) !== JSON.stringify(availability)) {
      throw new BadRequestException('availability_roundtrip_failed');
    }
    return { ok: true, availability: back.availability };
  }
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ProviderProductionController {
  constructor(private readonly svc: ProviderProductionService) {}

  // ── 1. pharmacy per-item insurance decision ──
  @Post('orders/:id/insurance-decision')
  orderInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.orderInsuranceDecision(u, id, b);
  }

  // ── 2-4. coverage decisions (exact governed paths) ──
  @Post('labs/bookings/:id/coverage-decision')
  labCoverage(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.labCoverageDecision(u, id, b); }
  @Post('radiology/bookings/:id/coverage-decision')
  radCoverage(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.radiologyCoverageDecision(u, id, b); }
  @Post('home-care/bookings/:id/coverage-decision')
  nursingCoverage(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.homecareCoverageDecision(u, id, b); }

  // ── 5-6. CRM exact paths ──
  @Get('provider/crm')
  listCrmPatients(@CurrentUser() u: any) { return this.svc.listCrmPatients(u); }
  @Get('provider/crm/:patientId')
  getCrm(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.getCrm(u, p); }
  @Post('provider/crm/:patientId')
  postCrm(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.putCrm(u, p, b); }
  @Put('provider/crm/:patientId')
  putCrm(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.putCrm(u, p, b); }

  // ── 7. referral tracking exact path ──
  @Get('provider/referrals/mine')
  myReferrals(@CurrentUser() u: any) { return this.svc.myReferrals(u); }

  @Post('provider/referrals')
  createReferral(@CurrentUser() u: any, @Body() b: any) { return this.svc.createReferral(u, b); }
  @Get('provider/referral-network')
  referralNetwork(@CurrentUser() u: any) { return this.svc.referralNetwork(u); }
  @Get('provider/promotions')
  listPromotions(@CurrentUser() u: any): Promise<any[]> { return this.svc.listPromotions(u); }
  @Post('provider/promotions')
  createPromotion(@CurrentUser() u: any, @Body() b: any) { return this.svc.createPromotion(u, b); }
  // ── 8. technician roster exact path ──
  @Get('hospital/staff-roster/technicians')
  listTechs(@CurrentUser() u: any) { return this.svc.listTechnicians(u); }
  @Post('hospital/staff-roster/technicians')
  createTech(@CurrentUser() u: any, @Body() b: any) { return this.svc.createTechnician(u, b); }
  @Patch('hospital/staff-roster/technicians/:id')
  updateTech(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.updateTechnician(u, id, b); }
  @Delete('hospital/staff-roster/technicians/:id')
  deleteTech(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteTechnician(u, id); }

  // ── 10. claims actions exact paths ──
  @Post('claims/:id/resubmit')
  claimResubmit(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.claimAction(u, id, 'resubmit', b); }
  @Post('claims/:id/approve')
  claimApprove(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.claimAction(u, id, 'approve', b); }
  @Post('claims/:id/reject')
  claimReject(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.claimAction(u, id, 'reject', b); }

  // ── 11. inbound reports exact path ──
  @Get('provider/reports/inbound')
  inboundReports(@CurrentUser() u: any) { return this.svc.inboundReports(u); }

  // ── 12. availability round-trip exact path ──
  @Get('provider/profile/availability')
  getAvailability(@CurrentUser() u: any) { return this.svc.getAvailability(u); }
  @Patch('provider/profile/availability')
  patchAvailability(@CurrentUser() u: any, @Body() b: any) { return this.svc.patchAvailability(u, b); }
}

@Module({
  controllers: [ProviderProductionController],
  providers: [ProviderProductionService],
})
export class ProviderProductionModule {}
