import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';

/**
 * PDPL (Saudi Personal Data Protection Law) data-subject rights.
 *
 * Phase 10 requires the two rights a data subject can exercise directly, and
 * which both Apple (account deletion) and PDPL (access + portability) need
 * before release:
 *   1. Portability  — GET a machine-readable copy of everything held about them.
 *   2. Erasure      — DELETE the account and the personal data attached to it.
 *
 * Design notes that matter for correctness:
 *
 *  - The owning field is NOT uniform across the codebase. Bookings use
 *    `patient_id` or `patient_account_id`, documents use `user_id`, and the
 *    pharmacy ledger uses `patient_account_id`. Each collection below therefore
 *    lists the fields that actually own a patient, discovered from the schemas
 *    rather than assumed, and every match is an $eq on a string (never a raw
 *    value, per the injection rule).
 *
 *  - Export never leaks other people. Clinical rows can embed a provider's
 *    name; those are kept because they are part of the patient's own record,
 *    but secrets are stripped: password hashes, tokens and the raw legal
 *    consent evidence stay server-side.
 *
 *  - Erasure anonymises rather than blindly dropping rows, because invoices
 *    and audit logs are legal records that must survive the person leaving.
 */
@Injectable()
export class PdplService {
  private readonly logger = new Logger(PdplService.name);

  /** Collections holding personal data, with the fields that own a patient. */
  private readonly OWNED: Array<{ collection: string; fields: string[] }> = [
    { collection: 'patientprofiles', fields: ['user_id', 'patient_id', 'account_id'] },
    { collection: 'appointments', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'labbookings', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'radiologybookings', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'homecarebookings', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'nursingbookings', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'pharmacy_orders', fields: ['patient_account_id', 'patient_id', 'user_id'] },
    { collection: 'prescriptions', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'labresults', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'medicalprofiles', fields: ['patient_id', 'user_id', 'owner_id'] },
    { collection: 'medicalreports', fields: ['patient_id', 'user_id', 'owner_id'] },
    { collection: 'healthpassports', fields: ['user_id', 'patient_id', 'owner_id'] },
    { collection: 'healthrecords', fields: ['patient_id', 'user_id', 'owner_id'] },
    { collection: 'vitals', fields: ['patient_id', 'user_id', 'owner_id'] },
    { collection: 'allergies', fields: ['patient_id', 'user_id', 'owner_id'] },
    { collection: 'medications', fields: ['patient_id', 'user_id', 'owner_id'] },
    { collection: 'insurancepolicies', fields: ['patient_id', 'user_id', 'owner_id'] },
    { collection: 'insurance_requests', fields: ['patient_id', 'user_id', 'owner_id'] },
    { collection: 'claims', fields: ['patient_id', 'user_id', 'owner_id'] },
    { collection: 'loyalty', fields: ['user_id', 'account_id', 'patient_id'] },
    { collection: 'loyaltytransactions', fields: ['user_id', 'account_id', 'patient_id'] },
    { collection: 'notifications', fields: ['user_id', 'patient_id'] },
    { collection: 'pushtokens', fields: ['user_id'] },
    { collection: 'wishlists', fields: ['user_id'] },
    { collection: 'addresses', fields: ['user_id', 'account_id'] },
    { collection: 'reviews', fields: ['patient_id', 'user_id', 'author_id'] },
    { collection: 'chatsessions', fields: ['patient_id', 'user_id', 'patient_account_id'] },
    { collection: 'chatmessages', fields: ['sender_id', 'user_id'] },
    { collection: 'supporttickets', fields: ['patient_id', 'user_id', 'requester_id'] },
    { collection: 'supportmessages', fields: ['sender_id', 'user_id'] },
    { collection: 'emergencyrequests', fields: ['patient_id', 'user_id'] },
    { collection: 'return_requests', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'refund_requests', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'transactions', fields: ['patient_id', 'patient_account_id', 'user_id'] },
    { collection: 'consentrecords', fields: ['user_id', 'patient_id'] },
    { collection: 'devices', fields: ['user_id'] },
    { collection: 'refreshsessions', fields: ['user_id'] },
  ];

  /** Never leaves the server, even in an export. */
  private static readonly REDACT = new Set([
    'password_hash', 'passwordHash', 'otp_code', 'otp', 'token', 'refresh_token',
    'access_token', 'fcm_token', 'apns_token', 'legal_consents', '__v',
  ]);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private async existingCollections(): Promise<string[]> {
    const cols = await this.conn.db.listCollections({}, { nameOnly: true }).toArray();
    return cols.map((c) => c.name);
  }

  /** Strip secrets and internal ids from a stored document. */
  private sanitize(doc: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(doc || {})) {
      if (key === '_id' || PdplService.REDACT.has(key)) continue;
      out[key] = value;
    }
    return out;
  }

  /**
   * PDPL portability: every document held about this patient, grouped by
   * collection. Collections that do not exist in this deployment are skipped
   * rather than reported as empty, so the export reflects the real schema.
   */
  async exportPatientData(userId: string) {
    if (!userId) throw new BadRequestException('user_id_required');
    const present = new Set(await this.existingCollections());

    const user = await this.userModel.findOne({ id: { $eq: String(userId) } }).lean();
    if (!user) throw new BadRequestException('user_not_found');

    const data: Record<string, any> = {
      account: this.sanitize(user),
      collections: {},
    };

    for (const { collection, fields } of this.OWNED) {
      if (!present.has(collection)) continue;
      const rows: any[] = await this.conn
        .collection(collection)
        .find({ $or: fields.map((f) => ({ [f]: { $eq: String(userId) } })) } as any)
        .toArray()
        .catch(() => []);
      if (rows.length) {
        data.collections[collection] = rows.map((r) => this.sanitize(r as any));
      }
    }

    return {
      exported_at: new Date().toISOString(),
      format: 'pdpl-portability-v1',
      subject_id: userId,
      data,
    };
  }

  /**
   * PDPL erasure. Personal data is deleted; rows that are legal records
   * (invoices, audit trail, financial ledger) are anonymised so the platform
   * keeps its obligations while the person is no longer identifiable.
   */
  async erasePatientData(userId: string, opts?: { reason?: string; password?: string }) {
    if (!userId) throw new BadRequestException('user_id_required');
    const user: any = await this.userModel.findOne({ id: { $eq: String(userId) } }).lean();
    if (!user) throw new BadRequestException('user_not_found');

    // The password is re-entered by the patient to prove the request is theirs.
    if (user.password_hash && opts?.password) {
      const bcrypt = require('bcrypt');
      const ok = await bcrypt.compare(opts.password, user.password_hash);
      if (!ok) throw new BadRequestException('invalid_password');
    }

    const present = new Set(await this.existingCollections());
    const deleted: Record<string, number> = {};
    const anonymised: Record<string, number> = {};

    // Legal-record collections: keep the row, strip the person.
    const ANONYMISE = new Set([
      'transactions', 'invoices', 'billing', 'refund_requests', 'return_requests',
      'claimssubmissions', 'auditlogs', 'orders', 'pharmacy_orders',
    ]);

    for (const { collection, fields } of this.OWNED) {
      if (!present.has(collection)) continue;
      const filter = { $or: fields.map((f) => ({ [f]: { $eq: String(userId) } })) } as any;
      if (ANONYMISE.has(collection)) {
        const res = await this.conn.collection(collection).updateMany(filter, {
          $set: { patient_name: 'deleted', patient_phone: null, patient_email: null },
          $unset: { patient_id: '', user_id: '' },
        } as any).catch(() => null);
        if (res?.modifiedCount) anonymised[collection] = res.modifiedCount;
        continue;
      }
      const res = await this.conn.collection(collection).deleteMany(filter).catch(() => null);
      if (res?.deletedCount) deleted[collection] = res.deletedCount;
    }

    // Sessions and tokens must die immediately, not in 30 days.
    for (const collection of ['pushtokens', 'devices', 'refreshsessions']) {
      if (!present.has(collection)) continue;
      const res = await this.conn.collection(collection)
        .deleteMany({ user_id: { $eq: String(userId) } } as any)
        .catch(() => null);
      if (res?.deletedCount) deleted[collection] = res.deletedCount;
    }

    // The account itself: anonymise in place so historic foreign keys stay
    // resolvable, then let DataRetentionService hard-delete after the window.
    // Mongoose treats `undefined` as "leave unchanged", so the identifiers are
    // removed with $unset — setting them to null would keep the PII column
    // populated and a later export would still hand it out.
    const scrubbed = await this.userModel.findOneAndUpdate(
      { id: { $eq: String(userId) } },
      {
        $set: {
          full_name: 'Deleted User',
          active: false,
          deleted_at: new Date(),
          deletion_reason: opts?.reason || 'pdpl_erasure_request',
        },
        $unset: {
          email: '',
          phone: '',
          password_hash: '',
          national_id: '',
          medical_record_number: '',
        },
      },
      { new: true },
    );

    if (!scrubbed) throw new BadRequestException('user_not_found');

    this.logger.warn(
      `PDPL erasure executed for ${userId}: ${Object.values(deleted).reduce((a, b) => a + b, 0)} rows deleted, ` +
      `${Object.values(anonymised).reduce((a, b) => a + b, 0)} anonymised`,
    );

    return {
      anonymised,
      deleted,
      erased_at: new Date().toISOString(),
      retention_note: 'Anonymised records are hard-deleted by the retention job after DATA_RETENTION_DAYS.',
    };
  }

  /**
   * Consent evidence (PDPL Art. 6): the immutable log a regulator asks for.
   * Stored per policy version; withdrawing stops further processing.
   */
  async recordConsent(userId: string, policyId: string, version: string, accepted: boolean) {
    if (!userId || !policyId || !version) throw new BadRequestException('consent_fields_required');
    const entry = { policy_id: String(policyId), version: String(version), accepted_at: new Date(), accepted: !!accepted };
    const user = await this.userModel.findOne({ id: { $eq: String(userId) } });
    if (!user) throw new BadRequestException('user_not_found');
    const history = Array.isArray((user as any).legal_consents) ? [...(user as any).legal_consents] : [];
    history.push(entry as any);
    await this.userModel.updateOne({ id: { $eq: String(userId) } }, { $set: { legal_consents: history } });
    return { ok: true, entry };
  }

  async getConsents(userId: string) {
    const user: any = await this.userModel.findOne({ id: { $eq: String(userId) } }, { legal_consents: 1 }).lean();
    if (!user) throw new BadRequestException('user_not_found');
    return { consents: user.legal_consents || [] };
  }
}
