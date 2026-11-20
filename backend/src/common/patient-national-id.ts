/**
 * The patient's national ID / iqama number (owner decision 6, 2026-11-10): asked for ONLY when a medical report is requested or issued and the number is
 * missing. It lives in its own collection, encrypted like the other personal health data (`fieldCrypto`), and shows in full only on the report; every
 * list and status answer masks it. Older rows that still hold it in plain text (`patient_profiles`, `users`) are read as a fallback and never written again.
 */
import { BadRequestException } from '@nestjs/common';
import type { Connection } from 'mongoose';
import { fieldCrypto } from './pdpl-compliance.module';
import { SA_PLUGINS } from '../modules/markets/plugins/registry';

const IDENTITY = 'patient_identity';

/** The launch market's national ID / iqama rule (`markets/plugins/identity.plugin.ts`). Throws `national_id_invalid`. */
export function normaliseNationalId(raw: unknown): string {
  const v = SA_PLUGINS.identity.normalise(raw);
  if (v === null) throw new BadRequestException('national_id_invalid');
  return v;
}

export function maskId(id: string | null | undefined): string | null {
  return SA_PLUGINS.identity.mask(id);
}

/** The number in clear text, or null when the patient never gave one. */
export async function readPatientNationalId(conn: Connection, userId: string): Promise<string | null> {
  const stored: any = await conn.collection(IDENTITY).findOne({ user_id: { $eq: userId } });
  const fromStore = typeof stored?.national_id === 'string' ? fieldCrypto().decrypt(stored.national_id) : '';
  if (fromStore) return fromStore;
  const legacyProfile: any = await conn.collection('patient_profiles').findOne({ user_id: { $eq: userId } }, { projection: { national_id: 1 } });
  if (typeof legacyProfile?.national_id === 'string' && legacyProfile.national_id.trim()) return legacyProfile.national_id.trim();
  const legacyUser: any = await conn.collection('users').findOne({ id: { $eq: userId } }, { projection: { national_id: 1 } });
  return typeof legacyUser?.national_id === 'string' && legacyUser.national_id.trim() ? legacyUser.national_id.trim() : null;
}

/** Validates and stores the number encrypted. Returns the masked value. */
export async function savePatientNationalId(conn: Connection, userId: string, raw: unknown): Promise<string | null> {
  const id = normaliseNationalId(raw);
  const now = new Date();
  await conn.collection(IDENTITY).createIndex({ user_id: 1 }, { unique: true });
  await conn.collection(IDENTITY).updateOne(
    { user_id: { $eq: userId } },
    { $set: { user_id: userId, national_id: fieldCrypto().encrypt(id), updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  return maskId(id);
}
