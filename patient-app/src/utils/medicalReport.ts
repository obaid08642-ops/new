/**
 * PT-08: the patient's medical reports with a recommended rest period (owner decision 2026-11-09: never called "sick leave" to the
 * patient; official sick leave is issued through Seha). The backend keeps the old name in its routes: GET /care/sick-leaves (list, ID
 * masked), GET /care/sick-leaves/:id (in full), GET /care/sick-leaves/:id/pdf. Same readers as the web (patient-web/lib/medical-reports/rest.ts).
 */
type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : null);
const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

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
  sehaNumber: string | null; // null while the registration is pending
};

export type MedicalReportDetail = MedicalReportRow & {
  patientName: string | null;
  specialtyAr: string | null;
  specialtyEn: string | null;
  licenceNo: string | null;
  consultationAt: string | null;
  bookingRef: string | null;
  reason: string | null;
  diagnosis: string | null; // only when the doctor chose to show it
  revokeReason: string | null;
};

function base(r: Row): MedicalReportRow | null {
  const id = str(r.id);
  if (!id) return null;
  const seha = str(r.seha_number);
  return {
    id,
    serial: str(r.serial),
    revoked: r.status === 'revoked',
    issuedAt: str(r.issued_at),
    from: str(r.from),
    to: str(r.to),
    days: num(r.days),
    doctorName: str(r.doctor_name),
    idNumber: str(r.national_id),
    sehaNumber: seha && r.seha_status !== 'pending' ? seha : null,
  };
}

const unwrap = (payload: unknown): unknown => {
  const r = row(payload);
  return r && 'data' in r ? r.data : payload;
};

export function readReportList(payload: unknown): MedicalReportRow[] {
  const list = unwrap(payload);
  return (Array.isArray(list) ? list : []).flatMap((entry) => {
    const r = row(entry);
    const b = r ? base(r) : null;
    return b ? [b] : [];
  });
}

export function readReportDetail(payload: unknown): MedicalReportDetail | null {
  const r = row(unwrap(payload));
  const b = r ? base(r) : null;
  if (!r || !b) return null;
  return {
    ...b,
    patientName: str(r.patient_name),
    specialtyAr: str(r.doctor_specialty_ar),
    specialtyEn: str(r.doctor_specialty_en),
    licenceNo: str(r.doctor_license_no),
    consultationAt: str(r.consultation_at),
    bookingRef: str(r.booking_ref),
    reason: str(r.reason),
    diagnosis: str(r.diagnosis),
    revokeReason: str(r.revoke_reason),
  };
}

/** The id as the backend issues it (a uuid or a serial like MED-2026-000001): anything else is not put in a path. */
export const isReportId = (value: string): boolean => /^[A-Za-z0-9-]{6,64}$/.test(value);
