// PT-05: builds the body of POST /provider/doctor-referrals/issue-referrals-and-prescription (IssueReferralsDto).
// The ids are the apps' UUIDs (appointment, patient, the signed-in doctor); the server checks that the visit is this doctor's.
export interface IssueReferralInput {
  appointmentId?: string | null;
  patientId?: string | null;
  doctorId?: string | null;
  labTests: string[];
  radScans: string[];
  homeCareNotes: string;
}

export interface IssueReferralBody {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  labTests: string[];
  radScans: string[];
  homeCareNotes?: string;
}

export const ISSUE_REFERRAL_URL = '/provider/doctor-referrals/issue-referrals-and-prescription';

/** Returns the request body, or the name of the missing piece. */
export function buildIssueReferralBody(i: IssueReferralInput): { body: IssueReferralBody } | { missing: 'visit' | 'patient' | 'doctor' | 'items' } {
  if (!i.appointmentId) return { missing: 'visit' };
  if (!i.patientId) return { missing: 'patient' };
  if (!i.doctorId) return { missing: 'doctor' };
  const notes = i.homeCareNotes.trim();
  if (!i.labTests.length && !i.radScans.length && !notes) return { missing: 'items' };
  return {
    body: {
      appointmentId: i.appointmentId,
      patientId: i.patientId,
      doctorId: i.doctorId,
      labTests: i.labTests,
      radScans: i.radScans,
      ...(notes ? { homeCareNotes: notes } : {}),
    },
  };
}
