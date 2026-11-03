/**
 * One store for a provider's private patient file (tags, notes, VIP, favourite, blocked). There used to be two writers on the same
 * collection with different keys (`provider-ops`: doctor_id, without `blocked`; `provider-production`: owner_id, with it), so a file
 * saved on one screen was not the file the other screen read, and a save of one field rebuilt the whole document (a partial save wiped
 * the rest). Both now read and write through here: the document is keyed by owner_id, a legacy doctor_id document is the starting
 * point when there is none yet, and a save changes only the fields it sends.
 */
import type { Connection } from 'mongoose';

export type CrmNote = { id: string; date: string; text: string };
export type CrmData = { tags: string[]; notes: CrmNote[]; vip: boolean; favorite: boolean; blocked: boolean; blocked_reason: string };
export const EMPTY_CRM: CrmData = { tags: [], notes: [], vip: false, favorite: false, blocked: false, blocked_reason: '' };

const COLLECTION = 'doctor_patient_crm';

/** Only the fields the caller sent, cleaned (limits as before: 50 tags of 60 characters, 200 notes of 2000). */
export function cleanCrmPatch(data: any): Partial<CrmData> {
  const out: Partial<CrmData> = {};
  if (data?.tags !== undefined) out.tags = Array.isArray(data.tags) ? data.tags.slice(0, 50).map((t: unknown) => String(t).slice(0, 60)) : [];
  if (data?.notes !== undefined) {
    out.notes = Array.isArray(data.notes)
      ? data.notes.slice(0, 200).map((n: any) => ({
          id: String(n?.id || `n_${Date.now()}`),
          date: String(n?.date || new Date().toISOString().slice(0, 10)),
          text: String(n?.text || '').slice(0, 2000),
        })).filter((n: CrmNote) => n.text)
      : [];
  }
  if (data?.vip !== undefined) out.vip = !!data.vip;
  if (data?.favorite !== undefined) out.favorite = !!data.favorite;
  if (data?.blocked !== undefined) {
    out.blocked = !!data.blocked;
    out.blocked_reason = data.blocked ? String(data?.blocked_reason || '').slice(0, 500) : '';
  } else if (data?.blocked_reason !== undefined) {
    out.blocked_reason = String(data.blocked_reason || '').slice(0, 500);
  }
  return out;
}

async function currentDoc(conn: Pick<Connection, 'collection'>, ownerId: string, patientId: string): Promise<any | null> {
  const col = conn.collection(COLLECTION);
  return (await col.findOne({ owner_id: { $eq: ownerId }, patient_id: { $eq: patientId } }, { projection: { _id: 0 } }))
    ?? (await col.findOne({ doctor_id: { $eq: ownerId }, patient_id: { $eq: patientId } }, { projection: { _id: 0 } }));
}

/** The file, with every field present (a patient with no file yet has the empty one, not a 404). */
export async function readCrm(conn: Pick<Connection, 'collection'>, ownerId: string, patientId: string): Promise<CrmData> {
  const doc = await currentDoc(conn, ownerId, patientId);
  return { ...EMPTY_CRM, ...(doc?.data ?? {}) };
}

/** Save the fields in `patch` and keep the rest of the file. Returns the whole file. */
export async function mergeCrm(conn: Pick<Connection, 'collection'>, ownerId: string, patientId: string, patch: any): Promise<CrmData> {
  const merged: CrmData = { ...(await readCrm(conn, ownerId, patientId)), ...cleanCrmPatch(patch) };
  await conn.collection(COLLECTION).updateOne(
    { owner_id: { $eq: ownerId }, patient_id: { $eq: patientId } },
    {
      $set: { data: merged, updatedAt: new Date() },
      $setOnInsert: { id: `crm_${Date.now()}`, owner_id: ownerId, patient_id: patientId, createdAt: new Date() },
    },
    { upsert: true },
  );
  return merged;
}

/** Files of an owner: the owner_id ones and the legacy doctor_id ones that have no owner_id twin. */
export async function listCrmRecords(conn: Pick<Connection, 'collection'>, ownerId: string, limit = 200): Promise<any[]> {
  const rows = await conn.collection(COLLECTION)
    .find({ $or: [{ owner_id: { $eq: ownerId } }, { doctor_id: { $eq: ownerId } }] }, { projection: { _id: 0, patient_id: 1, data: 1, updatedAt: 1, owner_id: 1 } })
    .sort({ updatedAt: -1 }).limit(limit * 2).toArray();
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of rows as any[]) {
    const key = String(r.patient_id);
    if (seen.has(key)) continue;   // the newest of the pair first
    seen.add(key);
    out.push(r);
  }
  return out.slice(0, limit);
}
