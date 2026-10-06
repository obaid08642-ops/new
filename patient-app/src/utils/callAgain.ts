/**
 * "Call again" opens the video-call screen, which starts a call for an APPOINTMENT. A call record (GET /calls/history)
 * carries the appointment it belonged to as `appointment_id`; its own `id` is the call session, which the video call
 * cannot use. A record without an appointment gets no button.
 */
export function callAgainParams(call: { appointment_id?: unknown }): { appointmentId: string } | null {
  const id = typeof call.appointment_id === 'string' ? call.appointment_id.trim() : '';
  return id ? { appointmentId: id } : null;
}
