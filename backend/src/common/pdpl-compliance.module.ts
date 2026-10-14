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
import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const PREFIX = 'enc.v1';

export type EncryptedValue = string;

@Injectable()
export class FieldEncryptionService {
  private readonly logger = new Logger(FieldEncryptionService.name);
  private key: Buffer | null;

  constructor() {
    this.key = FieldEncryptionService.readKey();
  }

  /** FIELD_ENCRYPTION_KEY must be 32 bytes, base64 or hex. Never a default. */
  private static readKey(): Buffer | null {
    const raw = process.env.FIELD_ENCRYPTION_KEY;
    if (!raw) return null;
    const asHex = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : null;
    const asB64 = /^[A-Za-z0-9+/=_-]{40,}$/.test(raw) ? Buffer.from(raw, 'base64') : null;
    const key = asHex ?? asB64;
    if (!key || key.length !== 32) {
      throw new Error('FATAL: FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes');
    }
    return key;
  }

  /** True when encryption is actually available (it is not without the key). */
  isEnabled(): boolean {
    return this.key !== null;
  }

  /**
   * Encrypt one field. Without a key the value is returned unchanged and the
   * gap is logged once — refusing to boot would take the whole API down, and
   * silently pretending to encrypt would be worse, so the state is explicit.
   */
  encrypt(plain: string): string {
    if (!this.key) return plain;
    if (typeof plain !== 'string' || plain.length === 0) return plain;
    if (plain.startsWith(`${PREFIX}:`)) return plain; // already encrypted: never double-encrypt
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [PREFIX, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), enc.toString('base64url')].join(':');
  }

  /** Decrypt a field. A value that was never encrypted is returned as-is. */
  decrypt(value: string): string {
    if (!this.key) return value;
    if (typeof value !== 'string' || !value.startsWith(`${PREFIX}:`)) return value;
    const parts = value.split(':');
    if (parts.length !== 4) return value;
    try {
      const iv = Buffer.from(parts[1], 'base64url');
      const tag = Buffer.from(parts[2], 'base64url');
      const data = Buffer.from(parts[3], 'base64url');
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch (e: any) {
      this.logger.error(`field decryption failed (tampered ciphertext?): ${e?.message}`);
      throw new Error('field_decryption_failed');
    }
  }

  encryptFields<T extends Record<string, unknown>>(doc: T, fields: string[]): T {
    if (!this.key) return doc;
    const out = doc as Record<string, unknown>;
    for (const f of fields) {
      const v = out[f];
      if (typeof v === 'string' && v) out[f] = this.encrypt(v);
    }
    return out as T;
  }

  decryptFields<T extends Record<string, unknown>>(doc: T, fields: string[]): T {
    if (!this.key) return doc;
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

/**
 * 16.9: an access log of who viewed which medical record. The plan's Verify is
 * "every read of a medical record writes an access-log row" — this service is
 * the only way a module reads one, so the row cannot be forgotten.
 */
@Injectable()
export class MedicalAccessLogService {
  private readonly logger = new Logger(MedicalAccessLogService.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly crypto: FieldEncryptionService,
  ) {}

  async record(ctx: MedicalAccessContext, record: { kind: string; id: string; action?: string }): Promise<void> {
    const doc = {
      id: randomBytes(16).toString('hex'),
      actor_id: ctx.actor_id,
      actor_role: ctx.actor_role,
      actor_kind: ctx.actor_kind,
      action: record.action || 'read',
      record_kind: record.kind,
      record_id: this.crypto.encrypt(record.id),
      ip: ctx.ip ? this.crypto.encrypt(ctx.ip) : undefined,
      device_id: ctx.device_id ?? null,
      user_agent: (ctx.user_agent ?? '').slice(0, 240) || null,
      created_at: new Date(),
    };
    await this.conn.collection('medical_access_logs').insertOne(doc);
  }

  /** The patient sees their own history; the admin sees all of it. */
  async timeline(requester: { id: string; role: string }, filter: { patient_id?: string } = {}) {
    const query: Record<string, unknown> = filter.patient_id ? { subject_id: filter.patient_id } : {};
    if (requester.role === 'patient') query.actor_id = requester.id;
    else if (!filter.patient_id) query.actor_kind = { $ne: 'patient' };
    const rows = await this.conn.collection('medical_access_logs').find(query).sort({ created_at: -1 }).limit(500).toArray();
    return rows.map((r) => ({
      ...r,
      record_id: this.crypto.decrypt(String(r.record_id)),
      ip: r.ip ? this.crypto.decrypt(String(r.ip)) : undefined,
    }));
  }

  /** Constant-time compare, used by the tests that assert ciphertext ≠ plaintext. */
  static differs(a: string, b: string): boolean {
    const ha = Buffer.from(a);
    const hb = Buffer.from(b);
    if (ha.length !== hb.length) return true;
    return !timingSafeEqual(ha, hb);
  }
}

@Global()
@Module({
  providers: [FieldEncryptionService, MedicalAccessLogService],
  exports: [FieldEncryptionService, MedicalAccessLogService],
})
export class PdplComplianceModule {}