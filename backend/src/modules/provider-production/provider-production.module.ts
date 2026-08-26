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
    assertProviderRole(user);
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
    if (decision === 'REJECTED' && !String(body.reason || '').trim()) {
      throw new BadRequestException('rejection reason is required');
    }

    const copayPercent = decision === 'APPROVED_PARTIAL'
      ? Math.min(99, Math.max(1, Number(body.copay_percent ?? 0)))
      : decision === 'APPROVED_FULL' ? 0 : undefined;
    const price = Number(b.total ?? b.price ?? 0);
    const copayAmount = copayPercent != null ? Math.round(price * (copayPercent / 100) * 100) / 100 : 0;

    const now = new Date();
    const mirrorStatus = decisionToMirror(decision, kind);
    const nextState = decision === 'REJECTED' ? 'PENDING_INSURANCE' : 'WAITING_COPAY';
    await col.updateOne({ id: bookingId }, {
      $set: {
        state: nextState,
        insurance_status: mirrorStatus,
        insurance_copay_amount: copayAmount,
        ...(copayPercent != null ? { insurance_copay_percent: copayPercent } : {}),
        ...(body.approval_code ? { insurance_approval_code: String(body.approval_code) } : {}),
        ...(decision === 'REJECTED' ? { insurance_rejection_reason: String(body.reason).trim() } : {}),
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
  async getCrm(user: any, patientId: string) {
    assertProviderRole(user);
    const doc: any = await this.conn.collection('doctor_patient_crm').findOne(
      { owner_id: user.id, patient_id: patientId },
      { projection: { _id: 0 } },
    );
    return doc?.data || { tags: [], notes: [], vip: false, favorite: false };
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
    const p: any = await this.conn.collection('provideraccounts').findOne({ id: user.id }, { projection: { _id: 0, availability: 1 } });
    return p?.availability || {
      is_accepting_requests: true, instant_available: false,
      vacation_from: null, vacation_to: null, weekly_schedule: [],
    };
  }

  async patchAvailability(user: any, body: any): Promise<any> {
    assertProviderRole(user);
    const allowedKeys = ['is_accepting_requests', 'instant_available', 'vacation_from', 'vacation_to', 'weekly_schedule'];
    const patch: any = {};
    for (const k of allowedKeys) if (body?.[k] !== undefined) patch[k] = body[k];
    if (patch.weekly_schedule !== undefined && !Array.isArray(patch.weekly_schedule)) {
      throw new BadRequestException('weekly_schedule_must_be_array');
    }
    // Upsert so any approved provider gets an availability doc on first write.
    await this.conn.collection('provideraccounts').updateOne(
      { id: user.id },
      { $set: { availability: patch, availability_updated_at: new Date(), updatedAt: new Date() }, $setOnInsert: { id: user.id } },
      { upsert: true },
    );
    // Round-trip guarantee: read-back must equal what was written.
    const back: any = await this.conn.collection('provideraccounts').findOne({ id: user.id }, { projection: { _id: 0, availability: 1 } });
    const availability = back?.availability || patch;
    for (const k of Object.keys(patch)) {
      if (JSON.stringify(availability[k]) !== JSON.stringify(patch[k])) {
        throw new BadRequestException(`availability_roundtrip_failed:${k}`);
      }
    }
    return { ok: true, availability };
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
  @Get('provider/crm/:patientId')
  getCrm(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.getCrm(u, p); }
  @Post('provider/crm/:patientId')
  postCrm(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.putCrm(u, p, b); }
  @Put('provider/crm/:patientId')
  putCrm(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.putCrm(u, p, b); }

  // ── 7. referral tracking exact path ──
  @Get('provider/referrals/mine')
  myReferrals(@CurrentUser() u: any) { return this.svc.myReferrals(u); }

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
