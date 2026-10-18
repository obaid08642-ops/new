/**
 * Phase 16.9 — health data protection under the Saudi PDPL.
 *
 * Health data is "sensitive" under the PDPL, so diagnoses, reports,
 * prescriptions and insurance documents are encrypted at rest, field by field,
 * with AES-256-GCM under a key that comes from the environment. The stored
 * value is ciphertext: the raw database column is never the readable text.
 *
 * Every read of a medical record writes an access-log row naming who read it,
 * which record, and from where — visible to the admin, and to the patient on
 * request.
 */
import { Global, Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';
import { currentLogContext, logEvent } from './structured-logger';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const PREFIX = 'enc.v1';

export type EncryptedValue = string;

@Injectable()
export class FieldEncryptionService {
  private readonly logger = new Logger(FieldEncryptionService.name);
  /** keys[0] encrypts; every key decrypts, so the key can be rotated without re-encrypting the day it changes. */
  private keys: Buffer[];

  constructor() {
    this.keys = FieldEncryptionService.readKeys();
    if (!this.keys.length && process.env.NODE_ENV === 'production') {
      // Health data is then stored in clear text. Booting is not refused (it would take the whole API down on the day this
      // ships), but the gap is an error on every boot and shows in the admin security status until the owner sets the key.
      logEvent('error', 'field_encryption_disabled', { reason: 'FIELD_ENCRYPTION_KEY is not set: health fields are stored unencrypted' }, 'security');
    }
  }

  private static parseKey(raw: string, name: string): Buffer {
    const asHex = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : null;
    const asB64 = /^[A-Za-z0-9+/=_-]{40,}$/.test(raw) ? Buffer.from(raw, 'base64') : null;
    const key = asHex ?? asB64;
    if (!key || key.length !== 32) throw new Error(`FATAL: ${name} must decode to exactly 32 bytes`);
    return key;
  }

  /** FIELD_ENCRYPTION_KEY (32 bytes, base64 or hex; never a default) then FIELD_ENCRYPTION_KEY_PREVIOUS (comma separated, decrypt only). */
  private static readKeys(): Buffer[] {
    const current = (process.env.FIELD_ENCRYPTION_KEY || '').trim();
    if (!current) return [];
    const previous = (process.env.FIELD_ENCRYPTION_KEY_PREVIOUS || '').split(',').map((k) => k.trim()).filter(Boolean);
    return [FieldEncryptionService.parseKey(current, 'FIELD_ENCRYPTION_KEY'), ...previous.map((k) => FieldEncryptionService.parseKey(k, 'FIELD_ENCRYPTION_KEY_PREVIOUS'))];
  }

  /** True when encryption is actually available (it is not without the key). */
  isEnabled(): boolean {
    return this.keys.length > 0;
  }

  /** True when the value is ciphertext of this service (whatever key). */
  static isCiphertext(value: unknown): boolean {
    return typeof value === 'string' && value.startsWith(`${PREFIX}:`);
  }

  /**
   * Encrypt one field. Without a key the value is returned unchanged (the gap is logged at boot in production).
   */
  encrypt(plain: string): string {
    if (!this.keys.length) return plain;
    if (typeof plain !== 'string' || plain.length === 0) return plain;
    if (plain.startsWith(`${PREFIX}:`)) return plain; // already encrypted: never double-encrypt
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.keys[0], iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [PREFIX, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), enc.toString('base64url')].join(':');
  }

  /**
   * Decrypt a field. A value that was never encrypted is returned as-is (rows written before the migration). Ciphertext that
   * cannot be decrypted - no key configured, or tampered - throws: showing the ciphertext to a user is never the fallback.
   */
  decrypt(value: string): string {
    if (typeof value !== 'string' || !value.startsWith(`${PREFIX}:`)) return value;
    if (!this.keys.length) throw new Error('field_encryption_key_missing');
    const parts = value.split(':');
    if (parts.length !== 4) return value;
    const iv = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    const data = Buffer.from(parts[3], 'base64url');
    for (const key of this.keys) {
      try {
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
      } catch {
        // wrong key or tampered: try the next key
      }
    }
    this.logger.error('field decryption failed (tampered ciphertext or unknown key)');
    throw new Error('field_decryption_failed');
  }

  encryptFields<T extends Record<string, unknown>>(doc: T, fields: string[]): T {
    if (!this.keys.length) return doc;
    const out = doc as Record<string, unknown>;
    for (const f of fields) {
      const v = out[f];
      if (typeof v === 'string' && v) out[f] = this.encrypt(v);
    }
    return out as T;
  }

  decryptFields<T extends Record<string, unknown>>(doc: T, fields: string[]): T {
    const out = doc as Record<string, unknown>;
    for (const f of fields) {
      const v = out[f];
      if (typeof v === 'string' && v) out[f] = this.decrypt(v);
    }
    return out as T;
  }
}

export interface MedicalAccessContext {
  actor_id: string;
  actor_role: string;
  actor_kind: 'patient' | 'provider' | 'admin' | 'system';
  ip?: string;
  device_id?: string;
  user_agent?: string;
}

export interface MedicalRecordRef {
  kind: string;
  id: string;
  action?: string;
  /** The patient the record is about: it is what lets the patient see who looked at their records. */
  subject_id?: string;
}

/** 16.9 retention of the access log: `MEDICAL_ACCESS_LOG_RETENTION_DAYS`, default 5 years (MOH medical-record minimum, 23.5). The owner and the lawyer confirm it. */
export function medicalAccessLogRetentionDays(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.MEDICAL_ACCESS_LOG_RETENTION_DAYS);
  return Number.isFinite(n) && n >= 30 ? Math.floor(n) : 1825;
}

/**
 * 16.9: an access log of who viewed which medical record. The plan's Verify is
 * "every read of a medical record writes an access-log row" - the services that serve a record call
 * `record()`/`recordMany()` before they return it. The collection is append-only by construction: nothing in the
 * app updates or deletes a row; rows leave it only through the TTL index below.
 */
@Injectable()
export class MedicalAccessLogService implements OnModuleInit {
  private readonly logger = new Logger(MedicalAccessLogService.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly crypto: FieldEncryptionService,
  ) {}

  async onModuleInit() {
    try {
      const col = this.conn.collection('medical_access_logs');
      await col.createIndex({ created_at: 1 }, { expireAfterSeconds: medicalAccessLogRetentionDays() * 86400, name: 'created_at_ttl' });
      await col.createIndex({ subject_id: 1, created_at: -1 }, { name: 'subject_created' });
      await col.createIndex({ actor_id: 1, created_at: -1 }, { name: 'actor_created' });
    } catch (e: any) {
      // an index problem must not stop the API; it is logged and shows up as a missing TTL in the admin check
      logEvent('error', 'medical_access_log_index_failed', { error: e?.message }, 'security');
    }
  }

  private row(ctx: MedicalAccessContext, record: MedicalRecordRef) {
    const live = currentLogContext();
    const ip = ctx.ip ?? live.ip;
    return {
      id: randomBytes(16).toString('hex'),
      actor_id: ctx.actor_id,
      actor_role: ctx.actor_role,
      actor_kind: ctx.actor_kind,
      action: record.action || 'read',
      record_kind: record.kind,
      record_id: this.crypto.encrypt(record.id),
      subject_id: record.subject_id ?? null,
      ip: ip ? this.crypto.encrypt(ip) : undefined,
      device_id: ctx.device_id ?? live.deviceId ?? null,
      user_agent: (ctx.user_agent ?? live.userAgent ?? '').slice(0, 240) || null,
      request_id: live.requestId ?? null,
      created_at: new Date(),
    };
  }

  async record(ctx: MedicalAccessContext, record: MedicalRecordRef): Promise<void> {
    await this.conn.collection('medical_access_logs').insertOne(this.row(ctx, record));
  }

  /** One row per record shown in a list; a list that shows medical text is a read of every record in it. */
  async recordMany(ctx: MedicalAccessContext, records: MedicalRecordRef[]): Promise<void> {
    if (!records.length) return;
    await this.conn.collection('medical_access_logs').insertMany(records.map((r) => this.row(ctx, r)), { ordered: false });
  }

  /**
   * The patient sees every access to their own records (including their own); the admin sees all of it, narrowed by
   * patient, actor or record kind. Newest first; `limit` is capped at 500.
   */
  async timeline(
    requester: { id: string; role: string },
    filter: { patient_id?: string; actor_id?: string; record_kind?: string; limit?: number } = {},
  ): Promise<Array<Record<string, any>>> {
    const query: Record<string, unknown> = {};
    if (requester.role === 'patient') query.subject_id = requester.id;
    else {
      if (filter.patient_id) query.subject_id = filter.patient_id;
      if (filter.actor_id) query.actor_id = filter.actor_id;
    }
    if (filter.record_kind) query.record_kind = filter.record_kind;
    const limit = Math.min(Math.max(Math.floor(filter.limit ?? 200), 1), 500);
    const rows = await this.conn.collection('medical_access_logs').find(query, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(limit).toArray() as Array<Record<string, any>>;
    return rows.map((r) => ({
      ...r,
      record_id: this.crypto.decrypt(String(r.record_id)),
      ip: r.ip ? this.crypto.decrypt(String(r.ip)) : undefined,
    }));
  }

  /** Constant-time compare, used by the tests that assert ciphertext != plaintext. */
  static differs(a: string, b: string): boolean {
    const ha = Buffer.from(a);
    const hb = Buffer.from(b);
    if (ha.length !== hb.length) return true;
    return !timingSafeEqual(ha, hb);
  }
}

/** Who is reading, from the authenticated user: the access log names the actor by id and kind, never by name. */
export function accessContextOf(user: { id?: string; role?: string } | null | undefined): MedicalAccessContext {
  const role = String(user?.role ?? 'unknown');
  return {
    actor_id: String(user?.id ?? 'unknown'),
    actor_role: role,
    actor_kind: role === 'patient' ? 'patient' : role === 'admin' || role === 'super_admin' ? 'admin' : 'provider',
  };
}

/**
 * Call before returning medical records to a caller. A failure to write the row must not hide the record from a
 * patient who is entitled to it, but it is never silent: it is an error line with the request id.
 */
export async function logMedicalRead(
  log: MedicalAccessLogService | undefined,
  user: { id?: string; role?: string } | null | undefined,
  records: MedicalRecordRef[],
): Promise<void> {
  if (!log || !records.length) return;
  try {
    await (records.length === 1 ? log.record(accessContextOf(user), records[0]) : log.recordMany(accessContextOf(user), records));
  } catch (e: any) {
    logEvent('error', 'medical_access_log_failed', { error: e?.message, kind: records[0].kind, count: records.length }, 'security');
  }
}

let shared: FieldEncryptionService | null = null;
/** The process-wide instance: schemas (plugins) and raw collection sites have no DI, and every user of it must see the same key. */
export function fieldCrypto(): FieldEncryptionService {
  return (shared ??= new FieldEncryptionService());
}
/** Tests that change FIELD_ENCRYPTION_KEY drop the cached instance. */
export function resetFieldCrypto(): void {
  shared = null;
}

@Global()
@Module({
  providers: [{ provide: FieldEncryptionService, useFactory: () => fieldCrypto() }, MedicalAccessLogService],
  exports: [FieldEncryptionService, MedicalAccessLogService],
})
export class PdplComplianceModule {}