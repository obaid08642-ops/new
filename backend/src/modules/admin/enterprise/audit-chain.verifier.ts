import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { ScheduledOnce } from '../../../common/scheduled-once';
import { verifyAdminAuditChain } from '../../../common/admin-audit-chain';

/** R13: nightly check of the admin audit hash chain (worker role). A broken chain is an error-level log line (Sentry) and `nabd_admin_audit_chain_ok` 0. */
@Injectable()
export class AdminAuditChainVerifier {
  private readonly logger = new Logger('AdminAuditChain');
  constructor(@InjectConnection() private readonly conn: Connection) {}

  // 2026-11-14: nightly heavy jobs run ONE AT A TIME (serial group) and 30 minutes apart, away from the 03:00 dump: 01:10 finance, 01:40 audit chain, 02:10 db integrity, 02:40 consistency, 04:30 reconciliation, 05:00 risk
  @Cron('40 1 * * *')
  @ScheduledOnce({ serial: 'nightly-heavy' })
  async nightly() {
    const r = await verifyAdminAuditChain(this.conn);
    if (r.ok) this.logger.log(`admin audit chain intact: ${r.checked} rows, head seq ${r.head_seq}`);
    else this.logger.error(`ADMIN AUDIT CHAIN BROKEN: ${r.findings.map((f) => `${f.code}${f.seq ? '@' + f.seq : ''}`).join(', ')} (checked ${r.checked})`);
    return r;
  }
}
