/**
 * Where a push tap lands. The backend sends `data.type`, `data.screen` (a route such as `/provider/job/<id>`), `data.action`
 * (JSON with the same route) and, for a call, `session_id`. Every provider dashboard is its own navigator, so the target is
 * resolved per provider type to a screen that navigator really has; a screen it does not have falls back to the notifications list.
 */
export interface PushTarget {
  screen: string;
  params?: Record<string, unknown>;
  /** A screen of the root navigator (the call screens), not of the provider's dashboard. */
  root?: boolean;
}

const DOCTOR_APPOINTMENT = new Set(['appointment', 'consultation', 'doctor_appointment']);

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object') return v as Record<string, unknown>;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch { return {}; } }
  return {};
}

/** The id and kind a notification points at, read from its route (`/provider/job/<id>`, `/tracking/<kind>/<id>`) or its data. */
export function pushSubject(data: unknown): { kind: string | null; id: string | null; type: string } {
  const d = asRecord(data);
  const type = String(d.type ?? 'info');
  const action = asRecord(d.action);
  const route = String(d.screen ?? action.route ?? '');
  const parts = route.split('/').filter(Boolean);
  const id = String(d.related_id ?? d.booking_id ?? d.thread_id ?? d.session_id ?? '') || null;
  if (parts[0] === 'provider' && parts[1] === 'job' && parts[2]) return { kind: String(d.related_type ?? 'job'), id: parts[2], type };
  if (parts[0] === 'tracking' && parts[2]) return { kind: parts[1], id: parts[2], type };
  return { kind: d.related_type ? String(d.related_type) : null, id, type };
}

export function resolvePushTarget(data: unknown, providerType: string): PushTarget {
  const { kind, id, type } = pushSubject(data);
  if (type === 'call') {
    // tapping the call notification (a build without the system call screen) opens the in-app incoming call for that session
    const d = asRecord(data);
    const sessionId = String(d.session_id ?? d.sessionId ?? '');
    if (sessionId) return { screen: 'IncomingCall', root: true, params: { sessionId, callerName: String(d.caller_name ?? d.callerName ?? d.title ?? ''), mode: (d.call_type ?? d.callType) === 'voice' ? 'voice' : 'video' } };
  }
  const t = String(providerType || '').toLowerCase();
  const isDoctor = t === 'doctor' || t === 'physician';
  if (isDoctor && id && kind && DOCTOR_APPOINTMENT.has(kind)) return { screen: 'appointment_detail', params: { param: { id } } };
  if (type === 'chat' && (t === 'lab' || t === 'laboratory')) return { screen: 'chat' };
  return { screen: 'notifications' };
}
