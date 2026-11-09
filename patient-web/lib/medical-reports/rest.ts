/**
 * PT-08: the patient's medical reports with a recommended rest period (owner decision 2026-11-09: never called "sick leave" to the patient;
 * official sick leave is issued through Seha). The backend keeps the old internal name in its routes:
 *   GET /care/sick-leaves          the patient's own list (ID number masked)
 *   GET /care/sick-leaves/:id      one in full
 *   GET /care/sick-leaves/:id/pdf  the PDF
 *   GET /verify/sick-leave/:code   public: valid or revoked, initials and dates only
 */
type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null);
const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

export type SehaState = { status: "pending" | "registered"; number: string | null };

export type MedicalReportRow = {
  id: string;
  serial: string | null;
  revoked: boolean;
  issuedAt: string | null;
  from: string | null;
  to: string | null;
  days: number | null;
  doctorName: string | null;
  idNumber: string | null;
  verifyCode: string | null;
  seha: SehaState;
};

export type MedicalReportDetail = MedicalReportRow & {
  patientName: string | null;
  facilityName: string | null;
  specialtyAr: string | null;
  specialtyEn: string | null;
  licenceNo: string | null;
  consultationAt: string | null;
  bookingRef: string | null;
  reason: string | null;
  diagnosis: string | null;
  revokeReason: string | null;
};

function base(r: Row): MedicalReportRow | null {
  const id = str(r.id);
  if (!id) return null;
  const number = str(r.seha_number);
  return {
    id,
    serial: str(r.serial),
    revoked: r.status === "revoked",
    issuedAt: str(r.issued_at),
    from: str(r.from),
    to: str(r.to),
    days: num(r.days),
    doctorName: str(r.doctor_name),
    idNumber: str(r.national_id),
    verifyCode: str(r.verify_code),
    seha: number && r.seha_status !== "pending" ? { status: "registered", number } : { status: "pending", number: null },
  };
}

const unwrap = (payload: unknown): unknown => { const r = row(payload); return r && "data" in r ? r.data : payload; };

/** The list: an array (or `{ data: [...] }`); rows without an id are dropped. */
export function readReportList(payload: unknown): MedicalReportRow[] {
  const list = unwrap(payload);
  return (Array.isArray(list) ? list : []).flatMap((entry) => { const r = row(entry); const b = r ? base(r) : null; return b ? [b] : []; });
}

export function readReportDetail(payload: unknown): MedicalReportDetail | null {
  const r = row(unwrap(payload));
  const b = r ? base(r) : null;
  if (!r || !b) return null;
  return {
    ...b,
    patientName: str(r.patient_name),
    facilityName: str(r.facility_name),
    specialtyAr: str(r.doctor_specialty_ar),
    specialtyEn: str(r.doctor_specialty_en),
    licenceNo: str(r.doctor_license_no),
    consultationAt: str(r.consultation_at),
    bookingRef: str(r.booking_ref),
    reason: str(r.reason),
    // the diagnosis arrives only when the doctor ticked "show diagnosis"
    diagnosis: str(r.diagnosis),
    revokeReason: str(r.revoke_reason),
  };
}

export type ReportVerification = { valid: boolean; revoked: boolean; serial: string | null; initials: string | null; from: string | null; to: string | null; days: number | null; issuedAt: string | null; revokedAt: string | null; sehaRegistered: boolean };

/** The public verify answer; null when it is not an object with a status. */
export function readVerification(payload: unknown): ReportVerification | null {
  const r = row(payload);
  if (!r || typeof r.valid !== "boolean") return null;
  return {
    valid: r.valid,
    revoked: r.status === "revoked",
    serial: str(r.serial),
    initials: str(r.initials),
    from: str(r.from),
    to: str(r.to),
    days: num(r.days),
    issuedAt: str(r.issued_at),
    revokedAt: str(r.revoked_at),
    sehaRegistered: r.seha_registered === true,
  };
}

/** A verify code as the backend issues it: 8 characters, no 0/O/1/I. Anything else is not sent anywhere. */
export const VERIFY_CODE = /^[A-HJ-NP-Z2-9]{8}$/;
export const isVerifyCode = (value: string): boolean => VERIFY_CODE.test(value.toUpperCase());
