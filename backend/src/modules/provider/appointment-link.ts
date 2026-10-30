import type { Connection } from 'mongoose';

/**
 * The appointment a certificate or report is written for: the first candidate (the body's appointment_id, then the route id) that is an appointment
 * of THIS doctor for THIS patient. A provider-request id or a stranger's appointment id is never stored as `appointment_id`, so the patient's visit
 * outcomes (GET /care/appointments/:id/outcomes) list exactly what the visit's doctor issued.
 */
export async function ownAppointmentId(conn: Connection, doctorUserId: string, patientId: string, candidates: unknown[]): Promise<string | null> {
  const ids = candidates.filter((c): c is string => typeof c === 'string' && c.length > 0 && c !== 'new');
  if (!ids.length || !doctorUserId || !patientId) return null;
  const rows = await conn.collection('appointments')
    .find({ id: { $in: ids }, patient_id: { $eq: String(patientId) }, doctor_user_id: { $eq: String(doctorUserId) } }, { projection: { _id: 0, id: 1 } })
    .toArray();
  const found = new Set(rows.map((r: any) => String(r.id)));
  return ids.find((c) => found.has(c)) ?? null;
}
