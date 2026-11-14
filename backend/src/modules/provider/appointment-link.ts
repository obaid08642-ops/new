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

/**
 * The doctor's own appointment by id, with the patient it is for: what a medical report is written on when the id is a normal
 * appointment (those never create a provider request). Another doctor's visit, an operator in the id, or no id: null.
 */
export async function ownedVisit(conn: Connection, doctorUserId: string, id: unknown): Promise<{ id: string; patient_id: string; patient_name: string | null } | null> {
  if (typeof id !== 'string' || !id || id === 'new' || !doctorUserId) return null;
  const a: any = await conn.collection('appointments').findOne(
    { id: { $eq: id }, $or: [{ doctor_user_id: { $eq: String(doctorUserId) } }, { provider_id: { $eq: String(doctorUserId) } }] },
    { projection: { _id: 0, id: 1, patient_id: 1, patient_name: 1 } },
  );
  if (!a?.patient_id) return null;
  return { id: String(a.id), patient_id: String(a.patient_id), patient_name: a.patient_name ?? null };
}
