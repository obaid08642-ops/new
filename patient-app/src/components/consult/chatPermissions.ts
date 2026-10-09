/**
 * Decision 24, the consultation thread's rules as the server states them: GET /chat/threads/:id/permissions
 * (backend/src/modules/chat/chat.module.ts, rules in consultation-window.ts). This file only reads that answer; it never
 * counts a window itself. A thread that is not a consultation booking answers without `emergency_line`, `can_voice` or
 * `online`, so a missing flag reads as "not allowed" and the emergency line falls back to the national number.
 */
export type WindowStatus = 'upcoming' | 'active' | 'follow_up' | 'closed';

export interface ThreadPermissions {
  canChat: boolean;
  canCall: boolean;
  canUpload: boolean;
  canVoice: boolean;
  online: boolean;
  status: WindowStatus;
  remainingHours?: number;
  readOnly: boolean;
  emergencyLine: string;
  followUp: { doctorId?: string; doctorUserId?: string; specialty?: string } | null;
}

export const DEFAULT_EMERGENCY_LINE = '997';
const STATUSES: readonly WindowStatus[] = ['upcoming', 'active', 'follow_up', 'closed'];

const asObject = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Reads the answer (bare or wrapped in `data`); null when it is not a permissions answer, so the caller keeps its own rules. */
export function parseThreadPermissions(raw: unknown): ThreadPermissions | null {
  const root = asObject(raw);
  const o = asObject(root?.data) ?? root;
  if (!o || typeof o.can_chat !== 'boolean') return null;
  const status = STATUSES.find((s) => s === o.status_code);
  if (!status) return null;
  const line = str(o.emergency_line);
  const fu = asObject(o.book_follow_up);
  const hours = typeof o.remaining_hours === 'number' && Number.isFinite(o.remaining_hours) ? Math.max(0, o.remaining_hours) : undefined;
  return {
    canChat: o.can_chat === true,
    canCall: o.can_call === true,
    canUpload: o.can_upload === true,
    canVoice: o.can_voice === true,
    online: o.online === true,
    status,
    remainingHours: hours,
    readOnly: o.read_only === true,
    // Only a plain phone number may reach a tel: link.
    emergencyLine: line && /^\d{2,6}$/.test(line) ? line : DEFAULT_EMERGENCY_LINE,
    followUp: fu && fu.action === 'book_follow_up' ? { doctorId: str(fu.doctor_id), doctorUserId: str(fu.doctor_user_id), specialty: str(fu.specialty) } : null,
  };
}

/** What the composer offers. Without an answer the older rules stand (the booking type), the server still refuses a send. */
export function composerRules(p: ThreadPermissions | null, bookingIsOnline: boolean) {
  if (!p) return { canType: true, canAttach: true, canCall: bookingIsOnline, canVoice: false, readOnly: false };
  return { canType: p.canChat && !p.readOnly, canAttach: p.canUpload && !p.readOnly, canCall: p.canCall && !p.readOnly, canVoice: p.canVoice && !p.readOnly, readOnly: p.readOnly };
}

/** The one-line window banner: the status message key plus the time left (follow-up only), both translated by the caller. */
export function windowBanner(p: ThreadPermissions | null): { statusKey: string; remaining?: { key: string; count: number } } | null {
  if (!p) return null;
  const statusKey = `consult.chat.window.${p.status}`;
  if (p.status !== 'follow_up' || p.remainingHours === undefined || p.remainingHours <= 0) return { statusKey };
  if (p.remainingHours < 1) return { statusKey, remaining: { key: 'consult.chat.window.minutesLeft', count: Math.max(1, Math.round(p.remainingHours * 60)) } };
  return { statusKey, remaining: { key: 'consult.chat.window.hoursLeft', count: Math.round(p.remainingHours) } };
}

/**
 * The follow-up booking: ids only, never health data. The booking route is keyed by the doctor profile id, so the server's
 * `doctor_id` comes first, then the id the screen was opened with, then the doctor's account id.
 */
export function followUpTarget(p: ThreadPermissions | null, routeDoctorId: string, appointmentId: string): { doctorId: string; appointmentId: string } | null {
  const doctorId = p?.followUp?.doctorId || routeDoctorId || p?.followUp?.doctorUserId || '';
  return doctorId && appointmentId ? { doctorId, appointmentId } : null;
}
