/**
 * PROVIDER PRODUCTION CONTRACTS — عقود المزوّدين السبعة (الحاكم)
 * يغطي مصفوفة السيناريوهات (نوع المزوّد × نقدي/تأمين) من الاستلام حتى الإتمام والحسابة.
 * يستهلكه الباكند (StateGuard/e2e) وعملاء المزوّدين (rendering/disabled).
 */
export type Coverage = 'CASH' | 'INSURANCE';
export type ProviderVertical = 'pharmacy' | 'doctor' | 'lab' | 'radiology' | 'nursing' | 'facility' | 'ambulance';
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
    copay_percent?: number;
    insurer_share?: number;
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
    notes: Array<{
        id: string;
        date: string;
        text: string;
    }>;
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
    reason?: string;
    updated_documents?: string[];
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
}
export declare enum ConsultationState {
    INCOMING = "INCOMING",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    WAITING_ROOM = "WAITING_ROOM",
    INSURANCE_DECISION_PENDING = "INSURANCE_DECISION_PENDING",
    CO_PAY_PENDING = "CO_PAY_PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    DOCUMENTATION = "DOCUMENTATION",// SOAP/Rx/sick-leave/referral
    COMPLETED = "COMPLETED",
    NO_SHOW = "NO_SHOW",
    CANCELLED = "CANCELLED"
}
export type ConsultationActor = 'DOCTOR' | 'PATIENT' | 'SYSTEM' | 'PAYMENT_WEBHOOK' | 'INSURER';
export declare const CONSULTATION_TRANSITIONS: ReadonlyArray<readonly [ConsultationState, ConsultationState, ConsultationActor, ((c?: any) => boolean)?]>;
export declare enum LabSampleStage {
    RECEIVED = "received",
    ANALYZING = "analyzing",
    RESULT_READY = "result_ready",
    RESULT_UPLOADED = "result_uploaded",
    SENT = "sent",
    SAMPLE_REJECTED = "sample_rejected"
}
export type LabQcAction = 'verify' | 'double_verify' | 'critical_value' | 'mark_urgent' | 'sample_rejected' | 'recollect_requested';
/** TAT يُحسب من الطوابع الزمنية الفعلية — لا جدول hardcoded */
export interface LabTatSnapshot {
    booking_id: string;
    collected_at?: string;
    received_at?: string;
    analysis_started_at?: string;
    result_ready_at?: string;
    reported_at?: string;
    tat_minutes?: number;
    sla_breach: boolean;
    catalog_turnaround_hours: number;
}
export declare enum RadiologyReportPhase {
    DRAFT = "DRAFT",
    UNDER_REVIEW = "UNDER_REVIEW",
    PUBLISHED = "PUBLISHED"
}
export declare const RADIOLOGY_REPORT_TRANSITIONS: ReadonlyArray<readonly [RadiologyReportPhase, RadiologyReportPhase, string]>;
export declare enum NursingVisitState {
    CONFIRMED = "CONFIRMED",
    IN_TRANSIT = "IN_TRANSIT",
    ARRIVED = "ARRIVED",// geofence ≤500m من GPS حقيقي
    CARE_IN_PROGRESS = "CARE_IN_PROGRESS",
    COMPLETED = "COMPLETED",// vitals + signature + visit-report
    NO_SHOW = "NO_SHOW",
    ESCALATED_EMERGENCY = "ESCALATED_EMERGENCY",
    CANCELLED = "CANCELLED"
}
export declare const NURSING_VISIT_TRANSITIONS: ReadonlyArray<readonly [NursingVisitState, NursingVisitState, ((c?: any) => boolean)?]>;
export declare enum ClaimStatus {
    SUBMITTED = "SUBMITTED",
    RESUBMITTED = "RESUBMITTED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    PAID = "PAID"
}
export declare const CLAIM_ACTIONS: ReadonlyArray<readonly [ClaimStatus, ClaimAction, ClaimStatus]>;
export declare enum AmbulanceMissionState {
    POOLED = "POOLED",
    CLAIMED = "CLAIMED",
    EN_ROUTE = "EN_ROUTE",// GPS tracking فعلي
    ON_SCENE = "ON_SCENE",
    HANDOVER = "HANDOVER",// تسليم المستشفى + ملاحظات
    COMPLETED = "COMPLETED",// ledger credit idempotent
    RELEASED = "RELEASED"
}
/** تحقق انتقال عام على أي آلة أعلاه. يدعم الصيغتين: [from,to,actor,guard?] و [from,to,guard?]. */
export declare function assertProviderTransition(machine: ReadonlyArray<readonly any[]>, from: string, to: string, actor: string, ctx?: any): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
/** قائمة الـ9 endpoints الحاكمة — تستخدمها e2e للتغطية. */
export declare const PROVIDER_NEW_ENDPOINTS: ReadonlyArray<{
    method: string;
    path: string;
    contract: string;
}>;
