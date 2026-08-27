"use strict";
/**
 * PROVIDER PRODUCTION CONTRACTS — عقود المزوّدين السبعة (الحاكم)
 * يغطي مصفوفة السيناريوهات (نوع المزوّد × نقدي/تأمين) من الاستلام حتى الإتمام والحسابة.
 * يستهلكه الباكند (StateGuard/e2e) وعملاء المزوّدين (rendering/disabled).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_NEW_ENDPOINTS = exports.AmbulanceMissionState = exports.CLAIM_ACTIONS = exports.ClaimStatus = exports.NURSING_VISIT_TRANSITIONS = exports.NursingVisitState = exports.RADIOLOGY_REPORT_TRANSITIONS = exports.RadiologyReportPhase = exports.LabSampleStage = exports.CONSULTATION_TRANSITIONS = exports.ConsultationState = void 0;
exports.assertProviderTransition = assertProviderTransition;
// ─── آلة حالة استشارة الطبيب ─────────────────────────────────────────────────
var ConsultationState;
(function (ConsultationState) {
    ConsultationState["INCOMING"] = "INCOMING";
    ConsultationState["ACCEPTED"] = "ACCEPTED";
    ConsultationState["REJECTED"] = "REJECTED";
    ConsultationState["WAITING_ROOM"] = "WAITING_ROOM";
    ConsultationState["INSURANCE_DECISION_PENDING"] = "INSURANCE_DECISION_PENDING";
    ConsultationState["CO_PAY_PENDING"] = "CO_PAY_PENDING";
    ConsultationState["IN_PROGRESS"] = "IN_PROGRESS";
    ConsultationState["DOCUMENTATION"] = "DOCUMENTATION";
    ConsultationState["COMPLETED"] = "COMPLETED";
    ConsultationState["NO_SHOW"] = "NO_SHOW";
    ConsultationState["CANCELLED"] = "CANCELLED";
})(ConsultationState || (exports.ConsultationState = ConsultationState = {}));
exports.CONSULTATION_TRANSITIONS = [
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
var LabSampleStage;
(function (LabSampleStage) {
    LabSampleStage["RECEIVED"] = "received";
    LabSampleStage["ANALYZING"] = "analyzing";
    LabSampleStage["RESULT_READY"] = "result_ready";
    LabSampleStage["RESULT_UPLOADED"] = "result_uploaded";
    LabSampleStage["SENT"] = "sent";
    LabSampleStage["SAMPLE_REJECTED"] = "sample_rejected";
})(LabSampleStage || (exports.LabSampleStage = LabSampleStage = {}));
// ─── تقرير الأشعة (draft → review → publish بصلاحيات) ───────────────────────
var RadiologyReportPhase;
(function (RadiologyReportPhase) {
    RadiologyReportPhase["DRAFT"] = "DRAFT";
    RadiologyReportPhase["UNDER_REVIEW"] = "UNDER_REVIEW";
    RadiologyReportPhase["PUBLISHED"] = "PUBLISHED";
})(RadiologyReportPhase || (exports.RadiologyReportPhase = RadiologyReportPhase = {}));
exports.RADIOLOGY_REPORT_TRANSITIONS = [
    [RadiologyReportPhase.DRAFT, RadiologyReportPhase.UNDER_REVIEW, 'radiologist'],
    [RadiologyReportPhase.UNDER_REVIEW, RadiologyReportPhase.PUBLISHED, 'radiologist|admin'],
    [RadiologyReportPhase.UNDER_REVIEW, RadiologyReportPhase.DRAFT, 'radiologist'], // رجعة للتعديل
];
// ─── زيارة التمريض ───────────────────────────────────────────────────────────
var NursingVisitState;
(function (NursingVisitState) {
    NursingVisitState["CONFIRMED"] = "CONFIRMED";
    NursingVisitState["IN_TRANSIT"] = "IN_TRANSIT";
    NursingVisitState["ARRIVED"] = "ARRIVED";
    NursingVisitState["CARE_IN_PROGRESS"] = "CARE_IN_PROGRESS";
    NursingVisitState["COMPLETED"] = "COMPLETED";
    NursingVisitState["NO_SHOW"] = "NO_SHOW";
    NursingVisitState["ESCALATED_EMERGENCY"] = "ESCALATED_EMERGENCY";
    NursingVisitState["CANCELLED"] = "CANCELLED";
})(NursingVisitState || (exports.NursingVisitState = NursingVisitState = {}));
exports.NURSING_VISIT_TRANSITIONS = [
    [NursingVisitState.CONFIRMED, NursingVisitState.IN_TRANSIT, (c) => c?.checklistComplete === true],
    [NursingVisitState.IN_TRANSIT, NursingVisitState.ARRIVED, (c) => c?.gpsDistanceKm != null && c.gpsDistanceKm <= 0.5],
    [NursingVisitState.ARRIVED, NursingVisitState.CARE_IN_PROGRESS],
    [NursingVisitState.CARE_IN_PROGRESS, NursingVisitState.COMPLETED, (c) => c?.vitalsRecorded === true && !!c?.signature_base64 && !!c?.visit_report],
    [NursingVisitState.ARRIVED, NursingVisitState.NO_SHOW],
    [NursingVisitState.CARE_IN_PROGRESS, NursingVisitState.ESCALATED_EMERGENCY, (c) => !!c?.reason],
];
// ─── مطالبات المنشأة (Claims Hub) ────────────────────────────────────────────
var ClaimStatus;
(function (ClaimStatus) {
    ClaimStatus["SUBMITTED"] = "SUBMITTED";
    ClaimStatus["RESUBMITTED"] = "RESUBMITTED";
    ClaimStatus["APPROVED"] = "APPROVED";
    ClaimStatus["REJECTED"] = "REJECTED";
    ClaimStatus["PAID"] = "PAID";
})(ClaimStatus || (exports.ClaimStatus = ClaimStatus = {}));
exports.CLAIM_ACTIONS = [
    [ClaimStatus.SUBMITTED, 'approve', ClaimStatus.APPROVED],
    [ClaimStatus.SUBMITTED, 'reject', ClaimStatus.REJECTED],
    [ClaimStatus.SUBMITTED, 'resubmit', ClaimStatus.RESUBMITTED],
    [ClaimStatus.REJECTED, 'resubmit', ClaimStatus.RESUBMITTED],
];
// ─── مهمة الإسعاف ────────────────────────────────────────────────────────────
var AmbulanceMissionState;
(function (AmbulanceMissionState) {
    AmbulanceMissionState["POOLED"] = "POOLED";
    AmbulanceMissionState["CLAIMED"] = "CLAIMED";
    AmbulanceMissionState["EN_ROUTE"] = "EN_ROUTE";
    AmbulanceMissionState["ON_SCENE"] = "ON_SCENE";
    AmbulanceMissionState["HANDOVER"] = "HANDOVER";
    AmbulanceMissionState["COMPLETED"] = "COMPLETED";
    AmbulanceMissionState["RELEASED"] = "RELEASED";
})(AmbulanceMissionState || (exports.AmbulanceMissionState = AmbulanceMissionState = {}));
// ─── بوابة تحقق موحدة (تستخدمها e2e والعملاء) ───────────────────────────────
/** تحقق انتقال عام على أي آلة أعلاه. يدعم الصيغتين: [from,to,actor,guard?] و [from,to,guard?]. */
function assertProviderTransition(machine, from, to, actor, ctx) {
    const match = machine.find((t) => t[0] === from && t[1] === to);
    if (!match)
        return { ok: false, reason: `illegal_transition:${from}->${to}` };
    const second = match[2];
    if (typeof second === 'function') {
        // صيغة بلا فاعل: [from,to,guard]
        if (!second(ctx))
            return { ok: false, reason: 'transition_guard_failed' };
        return { ok: true };
    }
    const allowedActors = second || '';
    if (allowedActors.split('|').indexOf(actor) === -1) {
        return { ok: false, reason: `forbidden_actor:${actor}_required:${allowedActors}` };
    }
    const guard = match[3];
    if (guard && !guard(ctx))
        return { ok: false, reason: 'transition_guard_failed' };
    return { ok: true };
}
/** قائمة الـ9 endpoints الحاكمة — تستخدمها e2e للتغطية. */
exports.PROVIDER_NEW_ENDPOINTS = [
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
