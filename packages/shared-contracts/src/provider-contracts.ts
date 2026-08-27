/**
 * PROVIDER PRODUCTION CONTRACTS — عقود المزوّدين السبعة (الحاكم)
 * يغطي مصفوفة السيناريوهات (نوع المزوّد × نقدي/تأمين) من الاستلام حتى الإتمام والحسابة.
 * يستهلكه الباكند (StateGuard/e2e) وعملاء المزوّدين (rendering/disabled).
 */

// ─── أدوات مشتركة ────────────────────────────────────────────────────────────

export type Coverage = 'CASH' | 'INSURANCE';
export type ProviderVertical =
  | 'pharmacy'
  | 'doctor'
  | 'lab'
  | 'radiology'
  | 'nursing'
  | 'facility'
  | 'ambulance';

/** قرار بنود الصيدلية على الطلب (P3-1) */
export interface OrderItemDecision {
  item_id: string;
  decision: 'approved' | 'rejected' | 'alternative';
  alternative_item_id?: string;
  reject_reason?: string;
}

/** POST /orders/:id/insurance-decision */
export interface OrderInsuranceDecisionRequest {
  items: OrderItemDecision[];
  copay_percent?: number;          // 0..100
  insurer_share?: number;          // SAR — يحسب سيرفريًا عند الغياب
  nphies_approval_code?: string;
  policy_number?: string;
  member_id?: string;
}
export interface OrderInsuranceDecisionResponse {
  ok: boolean;
  insurance_status: 'APPROVED' | 'PARTIAL' | 'REJECTED';
  copay_amount: number;
  patient_share: number;
  insurer_share: number;
  waiting_state: 'WAITING_COPAY';
}

/** POST /(labs|radiology|homecare)/bookings/:id/coverage-decision */
export interface BookingCoverageDecisionRequest {
  decision: 'APPROVED_FULL' | 'APPROVED_PARTIAL' | 'REJECTED';
  copay_percent?: number;
  copay_amount?: number;
  reason?: string;
  approval_code?: string;
}
export interface BookingCoverageDecisionResponse {
  ok: boolean;
  booking_id: string;
  insurance_status: 'APPROVED' | 'PARTIAL_APPROVAL' | 'REJECTED';
  next_state: 'WAITING_COPAY' | 'CONFIRMED' | 'CANCELLED';
  copay_amount: number;
}

/** GET+POST /provider/crm/:patientId */
export interface ProviderCrmPayload {
  tags: string[];
  notes: Array<{ id: string; date: string; text: string }>;
  vip: boolean;
  favorite: boolean;
}

/** GET /provider/referrals/mine */
export interface ProviderReferralRow {
  id: string;
  patient_name: string;
  target_type: 'lab' | 'radiology' | 'nursing' | 'hospital' | 'doctor';
  target_name?: string;
  tests_summary?: string;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  created_at: string;
}

/** CRUD /hospital/staff-roster/technicians */
export interface TechnicianRosterEntry {
  id: string;
  full_name: string;
  phone: string;
  department?: string;
  specialty?: string;
  suspended: boolean;
  created_at: string;
}
export interface TechnicianCreateRequest {
  full_name: string;
  phone: string;
  department?: string;
  specialty?: string;
}
/** الاستجابة تتضمن temp_password مرة واحدة فقط (يولّدها السيرفر). */
export interface TechnicianCreateResponse extends TechnicianRosterEntry {
  temp_password?: string;
}

/** CRUD /facility/shifts */
export interface FacilityShift {
  id: string;
  facility_account_id: string;
  staff_user_id: string;
  role: string;
  start_at: string;
  end_at: string;
  ward?: string;
  notes?: string;
  created_by: string;
}
export interface FacilityShiftCreateRequest {
  staff_user_id: string;
  role: string;
  start_at: string;
  end_at: string;
  ward?: string;
  notes?: string;
}

/** POST /claims/:id/{resubmit,approve,reject} */
export type ClaimAction = 'resubmit' | 'approve' | 'reject';
export interface ClaimActionRequest {
  reason?: string;              // إلزامي للرفض
  updated_documents?: string[]; // لإعادة الإرسال
}
export interface ClaimActionResponse {
  ok: boolean;
  claim_id: string;
  claim_status: 'RESUBMITTED' | 'APPROVED' | 'REJECTED';
  acted_by: string;
  acted_at: string;
}

/** GET /provider/reports/inbound */
export interface InboundReportRow {
  id: string;
  kind: 'LAB' | 'RADIOLOGY';
  booking_id: string;
  patient_name: string;
  test_name: string;
  status: 'REPORTED' | 'REPORT_PUBLISHED' | 'RESULT_UPLOADED';
  report_url?: string;
  dicom_viewer_url?: string;
  published_at?: string;
  created_at: string;
}

/** PATCH /provider/profile/availability */
export interface ProfileAvailabilityPatch {
  is_accepting_requests?: boolean;
  instant_available?: boolean;
  vacation_from?: string | null;
  vacation_to?: string | null;
  weekly_schedule?: Array<{
    day: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
    active: boolean;
    morning_start?: string;
    morning_end?: string;
    evening_start?: string;
    evening_end?: string;
  }>;
}
export interface ProfileAvailabilityResponse {
  ok: boolean;
  availability: {
    is_accepting_requests: boolean;
    instant_available: boolean;
    vacation_from: string | null;
    vacation_to: string | null;
    weekly_schedule: ProfileAvailabilityPatch['weekly_schedule'];
  };
  /** round-trip كامل: نفس القيمة تُقرأ فورًا بعد الكتابة */
}

// ─── آلة حالة استشارة الطبيب ─────────────────────────────────────────────────

export enum ConsultationState {
  INCOMING = 'INCOMING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WAITING_ROOM = 'WAITING_ROOM',
  INSURANCE_DECISION_PENDING = 'INSURANCE_DECISION_PENDING',
  CO_PAY_PENDING = 'CO_PAY_PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DOCUMENTATION = 'DOCUMENTATION',       // SOAP/Rx/sick-leave/referral
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

export type ConsultationActor = 'DOCTOR' | 'PATIENT' | 'SYSTEM' | 'PAYMENT_WEBHOOK' | 'INSURER';

export const CONSULTATION_TRANSITIONS: ReadonlyArray<readonly [ConsultationState, ConsultationState, ConsultationActor, ((c?: any) => boolean)?]> = [
  // الاستلام: ring عبر socket ثم قبول/رفض(سبب)
  [ConsultationState.INCOMING, ConsultationState.ACCEPTED, 'DOCTOR'],
  [ConsultationState.INCOMING, ConsultationState.REJECTED, 'DOCTOR', (c) => !!c?.reason],
  [ConsultationState.INCOMING, ConsultationState.NO_SHOW, 'SYSTEM'],
  [ConsultationState.ACCEPTED, ConsultationState.WAITING_ROOM, 'SYSTEM'],
  [ConsultationState.WAITING_ROOM, ConsultationState.IN_PROGRESS, 'DOCTOR'],
  // تأمين: رفع قرار الطبيب قبل الدفع (نفس endpoint D)
  [ConsultationState.WAITING_ROOM, ConsultationState.INSURANCE_DECISION_PENDING, 'DOCTOR', (c) => c?.coverage === 'INSURANCE'],
  [ConsultationState.INSURANCE_DECISION_PENDING, ConsultationState.CO_PAY_PENDING, 'INSURER', (c) => c?.decision === 'APPROVED_FULL' || c?.decision === 'APPROVED_PARTIAL'],
  [ConsultationState.CO_PAY_PENDING, ConsultationState.IN_PROGRESS, 'PAYMENT_WEBHOOK', (c) => c?.paymentVerified === true],
  [ConsultationState.WAITING_ROOM, ConsultationState.IN_PROGRESS, 'DOCTOR', (c) => c?.coverage === 'CASH'],
  [ConsultationState.IN_PROGRESS, ConsultationState.DOCUMENTATION, 'DOCTOR', (c) => c?.soapPresent === true],
  [ConsultationState.DOCUMENTATION, ConsultationState.COMPLETED, 'DOCTOR', (c) => c?.endConfirmed === true], // فشل end = خطأ ظاهر
];

// ─── سلسلة العينة في المختبر (barcode → stages → QC → نتيجة) ────────────────

export enum LabSampleStage {
  RECEIVED = 'received',
  ANALYZING = 'analyzing',
  RESULT_READY = 'result_ready',
  RESULT_UPLOADED = 'result_uploaded',
  SENT = 'sent',
  SAMPLE_REJECTED = 'sample_rejected',
}

export type LabQcAction =
  | 'verify'
  | 'double_verify'      // مع ownership صارم
  | 'critical_value'
  | 'mark_urgent'
  | 'sample_rejected'
  | 'recollect_requested';

/** TAT يُحسب من الطوابع الزمنية الفعلية — لا جدول hardcoded */
export interface LabTatSnapshot {
  booking_id: string;
  collected_at?: string;
  received_at?: string;
  analysis_started_at?: string;
  result_ready_at?: string;
  reported_at?: string;
  tat_minutes?: number;         // reported_at - collected_at (محسوب سيرفريًا)
  sla_breach: boolean;
  catalog_turnaround_hours: number;
}

// ─── تقرير الأشعة (draft → review → publish بصلاحيات) ───────────────────────

export enum RadiologyReportPhase {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PUBLISHED = 'PUBLISHED',
}
export const RADIOLOGY_REPORT_TRANSITIONS: ReadonlyArray<readonly [RadiologyReportPhase, RadiologyReportPhase, string]> = [
  [RadiologyReportPhase.DRAFT, RadiologyReportPhase.UNDER_REVIEW, 'radiologist'],
  [RadiologyReportPhase.UNDER_REVIEW, RadiologyReportPhase.PUBLISHED, 'radiologist|admin'],
  [RadiologyReportPhase.UNDER_REVIEW, RadiologyReportPhase.DRAFT, 'radiologist'],   // رجعة للتعديل
];

// ─── زيارة التمريض ───────────────────────────────────────────────────────────

export enum NursingVisitState {
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',                    // geofence ≤500m من GPS حقيقي
  CARE_IN_PROGRESS = 'CARE_IN_PROGRESS',
  COMPLETED = 'COMPLETED',                // vitals + signature + visit-report
  NO_SHOW = 'NO_SHOW',
  ESCALATED_EMERGENCY = 'ESCALATED_EMERGENCY',
  CANCELLED = 'CANCELLED',
}
export const NURSING_VISIT_TRANSITIONS: ReadonlyArray<readonly [NursingVisitState, NursingVisitState, ((c?: any) => boolean)?]> = [
  [NursingVisitState.CONFIRMED, NursingVisitState.IN_TRANSIT, (c) => c?.checklistComplete === true],
  [NursingVisitState.IN_TRANSIT, NursingVisitState.ARRIVED, (c) => c?.gpsDistanceKm != null && c.gpsDistanceKm <= 0.5],
  [NursingVisitState.ARRIVED, NursingVisitState.CARE_IN_PROGRESS],
  [NursingVisitState.CARE_IN_PROGRESS, NursingVisitState.COMPLETED, (c) => c?.vitalsRecorded === true && !!c?.signature_base64 && !!c?.visit_report],
  [NursingVisitState.ARRIVED, NursingVisitState.NO_SHOW],
  [NursingVisitState.CARE_IN_PROGRESS, NursingVisitState.ESCALATED_EMERGENCY, (c) => !!c?.reason],
];

// ─── مطالبات المنشأة (Claims Hub) ────────────────────────────────────────────

export enum ClaimStatus {
  SUBMITTED = 'SUBMITTED',
  RESUBMITTED = 'RESUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}
export const CLAIM_ACTIONS: ReadonlyArray<readonly [ClaimStatus, ClaimAction, ClaimStatus]> = [
  [ClaimStatus.SUBMITTED, 'approve', ClaimStatus.APPROVED],
  [ClaimStatus.SUBMITTED, 'reject', ClaimStatus.REJECTED],
  [ClaimStatus.SUBMITTED, 'resubmit', ClaimStatus.RESUBMITTED],
  [ClaimStatus.REJECTED, 'resubmit', ClaimStatus.RESUBMITTED],
];

// ─── مهمة الإسعاف ────────────────────────────────────────────────────────────

export enum AmbulanceMissionState {
  POOLED = 'POOLED',
  CLAIMED = 'CLAIMED',
  EN_ROUTE = 'EN_ROUTE',                  // GPS tracking فعلي
  ON_SCENE = 'ON_SCENE',
  HANDOVER = 'HANDOVER',                  // تسليم المستشفى + ملاحظات
  COMPLETED = 'COMPLETED',                // ledger credit idempotent
  RELEASED = 'RELEASED',                  // لم يتمكن من الاستلام
}

// ─── بوابة تحقق موحدة (تستخدمها e2e والعملاء) ───────────────────────────────

/** تحقق انتقال عام على أي آلة أعلاه. يدعم الصيغتين: [from,to,actor,guard?] و [from,to,guard?]. */
export function assertProviderTransition(
  machine: ReadonlyArray<readonly any[]>,
  from: string,
  to: string,
  actor: string,
  ctx?: any,
): { ok: true } | { ok: false; reason: string } {
  const match = machine.find((t: any) => t[0] === from && t[1] === to);
  if (!match) return { ok: false, reason: `illegal_transition:${from}->${to}` };
  const second = match[2];
  if (typeof second === 'function') {
    // صيغة بلا فاعل: [from,to,guard]
    if (!second(ctx)) return { ok: false, reason: 'transition_guard_failed' };
    return { ok: true };
  }
  const allowedActors: string = second || '';
  if (allowedActors.split('|').indexOf(actor) === -1) {
    return { ok: false, reason: `forbidden_actor:${actor}_required:${allowedActors}` };
  }
  const guard = match[3];
  if (guard && !guard(ctx)) return { ok: false, reason: 'transition_guard_failed' };
  return { ok: true };
}

/** قائمة الـ9 endpoints الحاكمة — تستخدمها e2e للتغطية. */
export const PROVIDER_NEW_ENDPOINTS: ReadonlyArray<{ method: string; path: string; contract: string }> = [
  { method: 'POST', path: '/orders/:id/insurance-decision', contract: 'OrderInsuranceDecisionRequest' },
  { method: 'POST', path: '/labs/bookings/:id/coverage-decision', contract: 'BookingCoverageDecisionRequest' },
  { method: 'POST', path: '/radiology/bookings/:id/coverage-decision', contract: 'BookingCoverageDecisionRequest' },
  { method: 'POST', path: '/home-care/bookings/:id/coverage-decision', contract: 'BookingCoverageDecisionRequest' },
  { method: 'GET', path: '/provider/crm/:patientId', contract: 'ProviderCrmPayload' },
  { method: 'POST', path: '/provider/crm/:patientId', contract: 'ProviderCrmPayload' },
  { method: 'GET', path: '/provider/referrals/mine', contract: 'ProviderReferralRow' },
  { method: 'POST', path: '/hospital/staff-roster/technicians', contract: 'TechnicianCreateRequest' },
  { method: 'GET', path: '/hospital/staff-roster/technicians', contract: 'TechnicianRosterEntry' },
  { method: 'PATCH', path: '/hospital/staff-roster/technicians/:id', contract: 'TechnicianCreateRequest' },
  { method: 'DELETE', path: '/hospital/staff-roster/technicians/:id', contract: '' },
  { method: 'GET', path: '/facility/shifts', contract: 'FacilityShift' },
  { method: 'POST', path: '/facility/shifts', contract: 'FacilityShiftCreateRequest' },
  { method: 'PATCH', path: '/facility/shifts/:id', contract: 'FacilityShiftCreateRequest' },
  { method: 'DELETE', path: '/facility/shifts/:id', contract: '' },
  { method: 'POST', path: '/claims/:id/resubmit', contract: 'ClaimActionRequest' },
  { method: 'POST', path: '/claims/:id/approve', contract: 'ClaimActionRequest' },
  { method: 'POST', path: '/claims/:id/reject', contract: 'ClaimActionRequest' },
  { method: 'GET', path: '/provider/reports/inbound', contract: 'InboundReportRow' },
  { method: 'PATCH', path: '/provider/profile/availability', contract: 'ProfileAvailabilityPatch' },
];
