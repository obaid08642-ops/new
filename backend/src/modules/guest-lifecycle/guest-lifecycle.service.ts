import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

/**
 * Phase 21 — guest data lifecycle.
 *
 * Inactive guests with no orders are deleted after GUEST_LIFECYCLE_MONTHS
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
    for (const g of guests) {
      const gid = String((g as any)?.id || (g as any)?.user_id || '');
      if (!gid) continue;
      let linked = 0;
      try {
        const [o1, o2] = await Promise.all([
          db.collection('orders').countDocuments({ patient_id: gid }),
          db.collection('pharmacy_orders').countDocuments({ patient_account_id: gid }),
        ]);
        linked = (o1 || 0) + (o2 || 0);
      } catch { linked = 1; } // fail closed: never delete when linkage is unknown
      if (this.dryRun) {
        this.logger.log(`guest-lifecycle dry-run: ${gid} would be ${linked ? 'anonymised' : 'deleted'}`);
        continue;
      }
      if (!linked) {
        await this.users.deleteOne({ id: gid });
        deleted++;
      } else {
        await this.users.updateOne(
          { id: gid },
          { $set: { full_name: 'Deleted Guest', email: null, phone: null, active: false, deleted_at: new Date() }, $unset: { password_hash: 1 } },
        );
        anonymised++;
      }
    }
    this.logger.log(`guest-lifecycle: ${deleted} deleted, ${anonymised} anonymised, ${guests.length} candidates (cutoff ${cutoff.toISOString().slice(0, 10)}, dry=${this.dryRun})`);
    return { ran: true, candidates: guests.length, deleted, anonymised, dryRun: this.dryRun };
  }
}
