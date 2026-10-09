/**
 * Owner decision 24: a doctor is reachable only inside a booked consultation.
 * - Online consultation: from confirmation until the follow-up window ends: text, images, files and voice notes;
 *   the call only while the consultation is active.
 * - Clinic or home visit: nothing before the doctor completes it; then, for the follow-up window, text, images and
 *   files only (no voice note, no call).
 * - After the window the thread is read-only and offers a follow-up booking. The doctor may close a thread early,
 *   or extend it once by another window.
 */
export const EMERGENCY_LINE = '997';

const ONLINE_TYPES = new Set(['video', 'online', 'audio', 'voice', 'tele', 'telemedicine', 'chat']);

/** Unknown or missing types count as online (older rows were all video consultations). */
export function isOnlineConsultation(appt: any): boolean {
  const t = String(appt?.service_type || appt?.consultation_type || appt?.type || '').toLowerCase();
  return !t || ONLINE_TYPES.has(t);
}

export type ConsultPhase = 'missing' | 'cancelled' | 'upcoming' | 'active' | 'follow_up' | 'expired' | 'closed';

export interface ConsultState {
  phase: ConsultPhase;
  online: boolean;
  can_chat: boolean;
  can_upload: boolean;
  can_voice: boolean;
  can_call: boolean;
  remaining_hours?: number;
  window_ends_at?: Date;
}

const none = (phase: ConsultPhase, online: boolean, extra: Partial<ConsultState> = {}): ConsultState =>
  ({ phase, online, can_chat: false, can_upload: false, can_voice: false, can_call: false, ...extra });

/** The window end: completion + window, or the doctor's one extension when it is later. */
export function followUpEnd(appt: any, thread: any, followupHours: number): Date {
  const completedAt = new Date(appt?.completed_at || appt?.updatedAt || Date.now());
  const end = new Date(completedAt.getTime() + followupHours * 3_600_000);
  const extended = thread?.extended_until ? new Date(thread.extended_until) : null;
  return extended && extended > end ? extended : end;
}

export function consultationState(appt: any, thread: any, followupHours: number, now = Date.now()): ConsultState {
  if (!appt) return none('missing', true);
  const online = isOnlineConsultation(appt);
  const status = String(appt.status || '').toUpperCase();
  if (['CANCELLED', 'NO_SHOW', 'RESCHEDULED'].includes(status)) return none('cancelled', online);
  if (thread?.closed_at) return none('closed', online);
  if (status === 'COMPLETED') {
    const end = followUpEnd(appt, thread, followupHours);
    const remaining = (end.getTime() - now) / 3_600_000;
    if (remaining <= 0) return none('expired', online, { remaining_hours: 0, window_ends_at: end });
    return { phase: 'follow_up', online, can_chat: true, can_upload: true, can_voice: online, can_call: false, remaining_hours: remaining, window_ends_at: end };
  }
  if (status === 'PENDING' || !online) return none('upcoming', online);
  return { phase: 'active', online, can_chat: true, can_upload: true, can_voice: true, can_call: true };
}

export function isVoiceMessage(type?: string): boolean {
  const t = String(type || '').toLowerCase();
  return t === 'voice' || t === 'audio' || t === 'voice_note';
}

/** The appointment's doctor: the account id doctors sign in with, or the profile id. */
export function isAppointmentDoctor(appt: any, userId: string): boolean {
  if (!appt || !userId) return false;
  return [appt.doctor_user_id, appt.provider_id, appt.provider_account_id, appt.doctor_id].some((x) => x && String(x) === String(userId));
}
