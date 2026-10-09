/**
 * Decision 24 (D1): pure helpers for the doctor's booking chat.
 * Backend: GET /chat/threads/:id/permissions, POST /chat/threads/:id/close, POST /chat/threads/:id/extend.
 */
export type ThreadStatus = 'upcoming' | 'active' | 'follow_up' | 'closed';

export interface ThreadPermissions {
  status: ThreadStatus;
  statusAr: string;
  statusEn: string;
  messageAr: string;
  messageEn: string;
  canChat: boolean;
  canUpload: boolean;
  canVoice: boolean;
  readOnly: boolean;
  extended: boolean;
  remainingHours: number | null;
  windowEndsAt: string | null;
  emergencyLine: string;
}

export const DEFAULT_EMERGENCY_LINE = '997';

const STATUSES: ThreadStatus[] = ['upcoming', 'active', 'follow_up', 'closed'];
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Maps the backend answer; an unknown status is treated as closed (nothing is enabled by guesswork). */
export function mapPermissions(raw: unknown): ThreadPermissions {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const code = str(r.status_code) as ThreadStatus;
  const status: ThreadStatus = STATUSES.includes(code) ? code : 'closed';
  const hours = Number(r.remaining_hours);
  return {
    status,
    statusAr: str(r.status_text_ar),
    statusEn: str(r.status_text_en),
    messageAr: str(r.message_ar),
    messageEn: str(r.message_en),
    canChat: r.can_chat === true,
    canUpload: r.can_upload === true,
    canVoice: r.can_voice === true,
    readOnly: r.read_only === true || status === 'closed',
    extended: r.extended === true,
    remainingHours: r.remaining_hours === undefined || r.remaining_hours === null || !Number.isFinite(hours) ? null : hours,
    windowEndsAt: str(r.window_ends_at) || null,
    emergencyLine: str(r.emergency_line) || DEFAULT_EMERGENCY_LINE,
  };
}

/** Close: any open thread. Extend: only the follow-up window, once. Both hidden when read-only. */
export function consultationActions(p: ThreadPermissions, extendedNow: boolean): { canClose: boolean; canExtend: boolean } {
  if (p.readOnly) return { canClose: false, canExtend: false };
  return { canClose: true, canExtend: p.status === 'follow_up' && !p.extended && !extendedNow };
}

export type ThreadErrorKey = 'already_extended' | 'only_doctor' | 'extend_after_completion' | 'other';

/** Reads the backend message code out of an axios-style error. */
export function threadErrorKey(err: unknown): ThreadErrorKey {
  const resp = (err as { response?: { status?: number; data?: { message?: unknown } } } | null)?.response;
  const msg = resp?.data?.message;
  const text = Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : '';
  if (text.includes('thread_already_extended')) return 'already_extended';
  if (text.includes('extend_only_after_completion')) return 'extend_after_completion';
  if (resp?.status === 403 || text.includes('only_the_consultation_doctor')) return 'only_doctor';
  return 'other';
}

/** Whole hours rounded up: an open window never reads "0 h left". */
export function remainingHoursLabel(hours: number | null, ar: boolean): string {
  if (hours === null) return '';
  const h = Math.max(0, Math.ceil(hours));
  return ar ? `المتبقي ${h} ساعة` : `${h} h left`;
}
