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

  @Cron('15 2 * * *')
  @ScheduledOnce()
  async nightly() {
    const r = await verifyAdminAuditChain(this.conn);
    if (r.ok) this.logger.log(`admin audit chain intact: ${r.checked} rows, head seq ${r.head_seq}`);
    else this.logger.error(`ADMIN AUDIT CHAIN BROKEN: ${r.findings.map((f) => `${f.code}${f.seq ? '@' + f.seq : ''}`).join(', ')} (checked ${r.checked})`);
    return r;
  }
}
