export type ConsultationServiceType = 'clinic' | 'home' | 'video';
const serviceTypes = new Set<ConsultationServiceType>(['clinic', 'home', 'video']);

export function appointmentStatusRouteParams(snapshot: unknown, expectedAppointmentId: string) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('appointment status snapshot unavailable');
  const appointment = snapshot as Record<string, unknown>;
  const id = typeof appointment.id === 'string' ? appointment.id.trim() : '';
  const serviceType = typeof appointment.service_type === 'string' ? appointment.service_type : '';
  if (!expectedAppointmentId || id !== expectedAppointmentId || !serviceTypes.has(serviceType as ConsultationServiceType)) throw new Error('appointment status snapshot is invalid');
  return { appointmentId: id, visitType: serviceType as ConsultationServiceType };
}
