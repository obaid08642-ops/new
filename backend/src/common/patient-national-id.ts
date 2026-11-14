/**
 * The patient's national ID / iqama number (owner decision 6, 2026-11-10): asked for ONLY when a medical report is requested or issued and the number is
 * missing. It lives in its own collection, encrypted like the other personal health data (`fieldCrypto`), and shows in full only on the report; every
 * list and status answer masks it. Older rows that still hold it in plain text (`patient_profiles`, `users`) are read as a fallback and never written again.
 */
import { BadRequestException } from '@nestjs/common';
import type { Connection } from 'mongoose';
import { fieldCrypto } from './pdpl-compliance.module';

const IDENTITY = 'patient_identity';

/** Arabic-Indic and Persian digits become ASCII; spaces and dashes go. */
function asciiDigits(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s-]/g, '');
}

/** Saudi national ID (starts 1) or iqama (starts 2): 10 digits and the Luhn-style check digit. Throws `national_id_invalid`. */
export function normaliseNationalId(raw: unknown): string {
  const v = typeof raw === 'string' ? asciiDigits(raw.trim()) : '';
  if (!/^[12]\d{9}$/.test(v)) throw new BadRequestException('national_id_invalid');
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = Number(v[i]);
    if (i % 2 === 0) { const t = d * 2; sum += t > 9 ? t - 9 : t; } else sum += d;
  }
  if (sum % 10 !== 0) throw new BadRequestException('national_id_invalid');
  return v;
}

export function maskId(id: string | null | undefined): string | null {
  const s = typeof id === 'string' ? id.trim() : '';
  if (!s) return null;
  return s.length <= 3 ? '*'.repeat(s.length) : '*'.repeat(s.length - 3) + s.slice(-3);
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
