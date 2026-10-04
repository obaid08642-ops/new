import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PDPL_OWNED_COLLECTIONS } from '../users/pdpl.service';

/** Session/token/preference rows that never justify keeping a guest; deleted with the guest. */
const EPHEMERAL = new Set(['pushtokens', 'devices', 'refreshsessions', 'notifications', 'wishlists', 'addresses']);
/** Records that keep a guest (anonymised, never deleted): PDPL's list minus the ephemeral rows, plus orders/invoices. */
const LINKED: ReadonlyArray<{ collection: string; fields: string[] }> = [
  ...PDPL_OWNED_COLLECTIONS.filter((c) => !EPHEMERAL.has(c.collection)),
  { collection: 'orders', fields: ['patient_id', 'user_id'] },
  { collection: 'invoices', fields: ['patient_id', 'user_id'] },
];

/**
 * Phase 21 — guest data lifecycle.
 *
 * Inactive guests with no linked records are deleted after GUEST_LIFECYCLE_MONTHS
 * (default 12). Guests WITH linked orders/invoices are anonymized in place
 * (identifiers stripped, row kept for legal records) — never hard-deleted —
 * following the same rule as PdplService's erasure path.
 *
 * Safety: the job is OPT-IN via GUEST_LIFECYCLE_ENABLED=true (default off).
 * A destructive scheduled job must never run because someone deployed the code;
 * it runs because someone configured it. GUEST_LIFECYCLE_DRY_RUN=true logs
 * what WOULD happen without writing.
 */
@Injectable()
export class GuestLifecycleService {
  private readonly logger = new Logger(GuestLifecycleService.name);

  constructor(@InjectModel('User') private users: Model<any>) {}

  private get enabled() {
    return String(process.env.GUEST_LIFECYCLE_ENABLED || 'false').toLowerCase() === 'true';
  }

  private get dryRun() {
    return String(process.env.GUEST_LIFECYCLE_DRY_RUN || 'false').toLowerCase() === 'true';
  }

  private get months() {
    const n = Number(process.env.GUEST_LIFECYCLE_MONTHS || 12);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 12;
  }

  /** Daily 3am, lowest-traffic window. */
  @Cron('0 3 * * *')
  async run() {
    if (!this.enabled) return { ran: false, reason: 'disabled' };
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - this.months);
    const guests: any[] = await this.users.find({
      is_guest: true,
      $and: [
        { $or: [{ last_login_at: { $lt: cutoff } }, { last_login_at: null }] },
        { updatedAt: { $lt: cutoff } },
      ],
    }).select({ id: 1, user_id: 1 }).lean();
    let deleted = 0;
    let anonymised = 0;
    const db: any = (this.users as any)?.db;
    let failed = 0;
    for (const g of guests) {
      const gid = String((g as any)?.id || (g as any)?.user_id || '');
      if (!gid) continue;
      try {
        const linked = await this.linkedRecords(db, gid);
        if (this.dryRun) {
          this.logger.log(`guest-lifecycle dry-run: ${gid} would be ${linked ? 'anonymised' : 'deleted'}`);
          continue;
        }
        await this.dropEphemeral(db, gid);
        if (!linked) {
          await this.users.deleteOne({ id: gid });
          deleted++;
        } else {
          // Same erasure rule as PdplService: identifiers are $unset, never set to null
          // (email/phone carry sparse unique indexes, which still index null).
          await this.users.updateOne(
            { id: gid },
            {
              $set: { full_name: 'Deleted Guest', active: false, deleted_at: new Date() },
              $unset: { email: '', phone: '', password_hash: '', national_id: '', medical_record_number: '' },
            },
          );
          anonymised++;
        }
      } catch (error: any) {
        failed++;
        this.logger.error(`guest-lifecycle: ${gid} skipped: ${error?.message || error}`);
      }
    }
    this.logger.log(`guest-lifecycle: ${deleted} deleted, ${anonymised} anonymised, ${failed} failed, ${guests.length} candidates (cutoff ${cutoff.toISOString().slice(0, 10)}, dry=${this.dryRun})`);
    return { ran: true, candidates: guests.length, deleted, anonymised, failed, dryRun: this.dryRun };
  }

  /** Records that keep the guest. Fails closed: an unreadable collection counts as linked. */
  private async linkedRecords(db: any, gid: string): Promise<number> {
    let total = 0;
    for (const { collection, fields } of LINKED) {
      try {
        total += await db.collection(collection).countDocuments({ $or: fields.map((f) => ({ [f]: { $eq: gid } })) });
      } catch {
        return 1;
      }
      if (total) return total;
    }
    return total;
  }

  /** Sessions, tokens and preferences die with the guest in both paths. */
  private async dropEphemeral(db: any, gid: string): Promise<void> {
    for (const { collection, fields } of PDPL_OWNED_COLLECTIONS.filter((c) => EPHEMERAL.has(c.collection))) {
      await db.collection(collection).deleteMany({ $or: fields.map((f) => ({ [f]: { $eq: gid } })) });
    }
  }
}
