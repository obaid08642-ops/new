// Pure logic of the doctor's medical-order composer (Ord22): payload building, validation and error mapping.
// Contract: backend/src/modules/medical-orders (POST /doctors/appointments/:id/medical-order).

export type OrderGroup = 'labs' | 'radiology' | 'nursing';
export type ValidDays = 30 | 90 | 180;
export const VALID_DAYS_OPTIONS: ValidDays[] = [30, 90, 180];
export const MAX_SESSIONS = 30;

export interface PickedItem { catalog_id: string; name_ar: string; name_en: string }
export interface PickedNursing extends PickedItem { sessions: number; interval_days: number }

export interface ComposerState {
  labs: PickedItem[];
  radiology: PickedItem[];
  nursing: PickedNursing[];
  prescriptionId: string | null;
  validDays: ValidDays | null; // null = let the backend choose its default
  notes: string;
}

export interface MedicalOrderPayload {
  labs?: Array<{ catalog_id: string }>;
  radiology?: Array<{ catalog_id: string }>;
  nursing?: Array<{ catalog_id: string; sessions: number; interval_days: number }>;
  prescription_id?: string;
  valid_days?: ValidDays;
  notes?: string;
}

export const emptyComposer = (): ComposerState => ({ labs: [], radiology: [], nursing: [], prescriptionId: null, validDays: 30, notes: '' });

export function itemCount(s: ComposerState): number {
  return s.labs.length + s.radiology.length + s.nursing.length + (s.prescriptionId ? 1 : 0);
}

export function canSend(s: ComposerState): boolean {
  return itemCount(s) > 0 && s.nursing.every(isNursingValid);
}

export function isNursingValid(n: PickedNursing): boolean {
  return Number.isInteger(n.sessions) && n.sessions >= 1 && n.sessions <= MAX_SESSIONS && Number.isFinite(n.interval_days) && n.interval_days >= 0;
}

/** Only non-empty groups are sent; the doctor never sends a provider. */
export function buildPayload(s: ComposerState): MedicalOrderPayload {
  const p: MedicalOrderPayload = {};
  if (s.labs.length) p.labs = s.labs.map((i) => ({ catalog_id: i.catalog_id }));
  if (s.radiology.length) p.radiology = s.radiology.map((i) => ({ catalog_id: i.catalog_id }));
  if (s.nursing.length) p.nursing = s.nursing.map((i) => ({ catalog_id: i.catalog_id, sessions: i.sessions, interval_days: i.interval_days }));
  if (s.prescriptionId) p.prescription_id = s.prescriptionId;
  if (s.validDays) p.valid_days = s.validDays;
  const notes = s.notes.trim();
  if (notes) p.notes = notes;
  return p;
}

/** Add an item once; a second tap on the same catalogue row is ignored. */
export function addUnique<T extends { catalog_id: string }>(list: T[], item: T): T[] {
  return list.some((i) => i.catalog_id === item.catalog_id) ? list : [...list, item];
}

export function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const MESSAGES: Record<string, { ar: string; en: string }> = {
  medical_order_empty: { ar: 'أضف بندًا واحدًا على الأقل قبل الإرسال', en: 'Add at least one item before sending' },
  valid_days_invalid: { ar: 'مدة الصلاحية غير صحيحة، اختر 30 أو 90 أو 180 يومًا', en: 'Invalid validity, choose 30, 90 or 180 days' },
  appointment_not_visited: { ar: 'لا يمكن كتابة أمر طبي قبل أن يتم الكشف', en: 'You can write an order only after the visit' },
  appointment_not_found: { ar: 'الموعد غير موجود', en: 'Appointment not found' },
  not_your_appointment: { ar: 'هذا الموعد ليس لك', en: 'This appointment is not yours' },
  catalog_item_not_found: { ar: 'أحد البنود لم يعد في الكتالوج الوطني، احذفه وأعد المحاولة', en: 'An item is no longer in the national catalogue, remove it and try again' },
  nursing_sessions_invalid: { ar: 'عدد الجلسات يجب أن يكون بين 1 و 30', en: 'Sessions must be between 1 and 30' },
  nursing_interval_invalid: { ar: 'الفاصل بين الجلسات غير صحيح', en: 'The interval between sessions is invalid' },
  prescription_not_found: { ar: 'الوصفة المرتبطة غير موجودة', en: 'The linked prescription was not found' },
};

/** Backend sends the stable code as the message of the error body (string or array). */
export function extractErrorCode(err: any): string | null {
  const m = err?.response?.data?.message;
  const v = Array.isArray(m) ? m[0] : m;
  return typeof v === 'string' && v ? v : null;
}

export function mapOrderError(err: any, AR: boolean): string {
  const code = extractErrorCode(err);
  const hit = code ? MESSAGES[code] : undefined;
  if (hit) return AR ? hit.ar : hit.en;
  if (!err?.response) return AR ? 'تحقق من الاتصال ثم حاول مرة أخرى' : 'Check your connection and try again';
  return AR ? 'تعذّر إرسال الأمر' : 'Could not send the order';
}

/** The backend accepts a medical order only for a visited appointment (completed / in progress), any letter case. */
export function isVisitedStatus(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'completed' || s === 'in_progress';
}
