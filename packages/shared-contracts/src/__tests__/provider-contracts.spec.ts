/**
 * Shared-contracts unit gate — machines for the 7 provider verticals + the 9
 * governed endpoints. Run with backend jest: npx jest shared-contracts
 */
import {
  ConsultationState, CONSULTATION_TRANSITIONS,
  NursingVisitState, NURSING_VISIT_TRANSITIONS,
  ClaimStatus, CLAIM_ACTIONS,
  RadiologyReportPhase, RADIOLOGY_REPORT_TRANSITIONS,
  LabSampleStage,
  AmbulanceMissionState,
  assertProviderTransition,
  PROVIDER_NEW_ENDPOINTS,
} from '../provider-contracts';

describe('P2 — provider contracts (7 verticals)', () => {
  it('doctor: incoming → accept/reject → waiting room → in-progress → documentation → completed', () => {
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.INCOMING, ConsultationState.ACCEPTED, 'DOCTOR').ok).toBe(true);
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.INCOMING, ConsultationState.REJECTED, 'DOCTOR', { reason: 'x' }).ok).toBe(true);
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.INCOMING, ConsultationState.REJECTED, 'DOCTOR').ok).toBe(false); // سبب إلزامي
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.ACCEPTED, ConsultationState.WAITING_ROOM, 'SYSTEM').ok).toBe(true);
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.WAITING_ROOM, ConsultationState.IN_PROGRESS, 'DOCTOR', { coverage: 'CASH' }).ok).toBe(true);
    // تأمين: القرار قبل الدفع
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.WAITING_ROOM, ConsultationState.INSURANCE_DECISION_PENDING, 'DOCTOR', { coverage: 'INSURANCE' }).ok).toBe(true);
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.INSURANCE_DECISION_PENDING, ConsultationState.CO_PAY_PENDING, 'INSURER', { decision: 'APPROVED_PARTIAL' }).ok).toBe(true);
    // إنهاء: فشل end = خطأ ظاهر (الانتقال يتطلب endConfirmed)
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.DOCUMENTATION, ConsultationState.COMPLETED, 'DOCTOR', { endConfirmed: true }).ok).toBe(true);
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.DOCUMENTATION, ConsultationState.COMPLETED, 'DOCTOR', {}).ok).toBe(false);
    // ممنوع القفز للاكتمال مباشرة
    expect(assertProviderTransition(CONSULTATION_TRANSITIONS as any, ConsultationState.INCOMING, ConsultationState.COMPLETED, 'DOCTOR').ok).toBe(false);
  });

  it('nursing: transit needs checklist; arrive needs GPS ≤500m; complete needs vitals+signature+report', () => {
    expect(assertProviderTransition(NURSING_VISIT_TRANSITIONS as any, NursingVisitState.CONFIRMED, NursingVisitState.IN_TRANSIT, 'PROVIDER', { checklistComplete: false }).ok).toBe(false);
    expect(assertProviderTransition(NURSING_VISIT_TRANSITIONS as any, NursingVisitState.IN_TRANSIT, NursingVisitState.ARRIVED, 'PROVIDER', { gpsDistanceKm: 0.3 }).ok).toBe(true);
    expect(assertProviderTransition(NURSING_VISIT_TRANSITIONS as any, NursingVisitState.IN_TRANSIT, NursingVisitState.ARRIVED, 'PROVIDER', { gpsDistanceKm: 1.2 }).ok).toBe(false);
    expect(assertProviderTransition(NURSING_VISIT_TRANSITIONS as any, NursingVisitState.CARE_IN_PROGRESS, NursingVisitState.COMPLETED, 'PROVIDER', { vitalsRecorded: true, signature_base64: 'x', visit_report: 'r' }).ok).toBe(true);
    expect(assertProviderTransition(NURSING_VISIT_TRANSITIONS as any, NursingVisitState.CARE_IN_PROGRESS, NursingVisitState.COMPLETED, 'PROVIDER', { vitalsRecorded: true, signature_base64: '', visit_report: '' }).ok).toBe(false);
  });

  it('facility claims: submitted→approve/reject/resubmit and rejected→resubmit only', () => {
    const find = (from: ClaimStatus, action: string) => CLAIM_ACTIONS.find((c) => c[0] === from && c[1] === action);
    expect(find(ClaimStatus.SUBMITTED, 'approve')).toBeTruthy();
    expect(find(ClaimStatus.SUBMITTED, 'reject')).toBeTruthy();
    expect(find(ClaimStatus.SUBMITTED, 'resubmit')).toBeTruthy();
    expect(find(ClaimStatus.REJECTED, 'resubmit')).toBeTruthy();
    expect(find(ClaimStatus.REJECTED, 'approve')).toBeFalsy();
  });

  it('radiology report: draft → review → publish with roles', () => {
    expect(RADIOLOGY_REPORT_TRANSITIONS.find((t) => t[0] === RadiologyReportPhase.UNDER_REVIEW && t[1] === RadiologyReportPhase.PUBLISHED)).toBeTruthy();
    expect(RADIOLOGY_REPORT_TRANSITIONS.find((t) => t[0] === RadiologyReportPhase.DRAFT && t[1] === RadiologyReportPhase.PUBLISHED)).toBeFalsy();
  });

  it('lab pipeline stage enum covers barcode chain + rejection', () => {
    expect(LabSampleStage.RECEIVED).toBeDefined();
    expect(LabSampleStage.ANALYZING).toBeDefined();
    expect(LabSampleStage.RESULT_UPLOADED).toBeDefined();
    expect(LabSampleStage.SAMPLE_REJECTED).toBeDefined();
  });

  it('ambulance mission enum covers pool→claim→track→handover→complete', () => {
    expect(AmbulanceMissionState.POOLED).toBeDefined();
    expect(AmbulanceMissionState.CLAIMED).toBeDefined();
    expect(AmbulanceMissionState.EN_ROUTE).toBeDefined();
    expect(AmbulanceMissionState.HANDOVER).toBeDefined();
    expect(AmbulanceMissionState.COMPLETED).toBeDefined();
  });

  it('governed endpoint list includes all 9 planned surfaces', () => {
    const paths = PROVIDER_NEW_ENDPOINTS.map((e) => e.path);
    expect(paths).toContain('/orders/:id/insurance-decision');
    expect(paths).toContain('/labs/bookings/:id/coverage-decision');
    expect(paths).toContain('/radiology/bookings/:id/coverage-decision');
    expect(paths).toContain('/home-care/bookings/:id/coverage-decision');
    expect(paths).toContain('/provider/crm/:patientId');
    expect(paths).toContain('/provider/referrals/mine');
    expect(paths).toContain('/hospital/staff-roster/technicians');
    expect(paths).toContain('/facility/shifts');
    expect(paths).toContain('/claims/:id/approve');
    expect(paths).toContain('/provider/reports/inbound');
    expect(paths).toContain('/provider/profile/availability');
  });
});
