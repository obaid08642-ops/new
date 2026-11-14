import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Roles } from '../../../../common/auth.guard';
import { UserRole } from '../../../../common/enums';
import { Permission, RequirePermissions } from '../../../../common/permissions';
import { earningRecord } from '../../../finance-engine/commission-summary';

@Controller('admin/finance')
@Roles(UserRole.ADMIN)
export class FinanceController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  // Per-transaction commission records (commissions.tsx, financial-ledger.tsx). It was GET /admin/finance/commissions,
  // the same route as the finance suite's commission report, so only one of them could ever answer.
  // screens-audit-3 gap 23: the list used to read the legacy `commissionledgers` collection, which nothing writes. The records are now the
  // settlement's `provider_earning` rows (newest 200), with the legacy field names the page reads.
  @Get('commissions/records')
  @RequirePermissions(Permission.FINANCE_READ)
  async getCommissions() {
    const ledger = this.conn.collection('platformledgerentries');
    const rows: any[] = await ledger.find({ type: 'provider_earning' }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    const ids = [...new Set(rows.map((r) => String(r.provider_account_id || '')).filter(Boolean))];
    const accounts: any[] = ids.length
      ? await this.conn.collection('provider_accounts').find({ $or: [{ id: { $in: ids } }, { user_id: { $in: ids } }] }, { projection: { _id: 0, id: 1, user_id: 1, name: 1, name_ar: 1, display_name: 1 } }).toArray()
      : [];
    const nameOf = (accountId: string) => {
      const a = accounts.find((x) => x.id === accountId || x.user_id === accountId);
      return a?.display_name || a?.name || a?.name_ar || undefined;
    };
    return { data: rows.map((r) => earningRecord(r, nameOf(String(r.provider_account_id || '')))) };
  }
}
