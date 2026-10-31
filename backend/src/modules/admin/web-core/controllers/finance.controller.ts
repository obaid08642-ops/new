import { Body, Controller, Get, NotFoundException, BadRequestException, Param, Post } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { CommissionLedger } from '../schemas/commission-ledger.schema';
import { WithdrawalRequest } from '../schemas/withdrawal-request.schema';
import { LedgerService, ApprovalService } from '../../../finance-engine/finance-engine.module';
import { CurrentUser, Roles } from '../../../../common/auth.guard';
import { UserRole } from '../../../../common/enums';
import { RejectPayoutDto } from './finance.dto';
import { Permission, RequirePermissions } from '../../../../common/permissions';

/**
 * Legacy `WithdrawalRequest` rows only (status 'pending'). Nothing creates them any more.
 *
 * A provider's withdrawal request (`providerwithdrawals`) has ONE state machine, in FinanceSuiteService
 * (GET/POST /admin/finance/payouts...): approve, a second approval for large amounts, execute (PAID), reject. These routes
 * used to pay such a request straight from PENDING_ADMIN_APPROVAL, around those approvals, and are not used for it any more.
 *
 * E1 S7/S9/S14: executing a legacy payout APPENDS a 'payout' ledger entry (the same money can never be paid out twice), rejects
 * payouts that exceed the provider's real available balance, and routes large payouts through maker-checker approval.
 */
@Controller('admin/finance')
@Roles(UserRole.ADMIN)
export class FinanceController {
  constructor(
    @InjectModel(CommissionLedger.name) private commissionModel: Model<CommissionLedger>,
    @InjectModel(WithdrawalRequest.name) private withdrawalModel: Model<WithdrawalRequest>,
    @InjectConnection() private readonly conn: Connection,
    private readonly ledger: LedgerService,
    private readonly approvals: ApprovalService,
  ) {}

  // Per-transaction commission records (commissions.tsx, financial-ledger.tsx). It was GET /admin/finance/commissions,
  // the same route as the finance suite's commission report, so only one of them could ever answer.
  @Get('commissions/records')
  @RequirePermissions(Permission.FINANCE_READ)
  async getCommissions() {
    const data = await this.commissionModel.find().exec();
    return { data };
  }

  @Get('withdrawals/pending')
  async getPendingWithdrawals() {
    const legacy = await this.withdrawalModel.find({ status: 'pending' }).lean().exec();
    const normalized = (legacy || []).map((w: any) => ({
      id: String(w._id),
      source: 'legacy',
      providerId: w.providerId || w.provider_id,
      providerName: w.providerName || w.provider_name,
      amount: w.amount,
      bankName: w.bankName,
      iban: w.iban,
      status: 'pending',
      createdAt: w.createdAt,
    })).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return { data: normalized };
  }

  @RequirePermissions(Permission.FINANCE_PAYOUT_APPROVE)
  @Post('withdrawals/:id/execute')
  async executePayout(@Param('id') id: string, @CurrentUser() admin: any) {
    // Legacy rows are keyed by Mongo `_id`. A provider's withdrawal request is paid through POST payouts/:id/execute.
    const legacyDoc: any = await this.withdrawalModel.findOne({ _id: id, status: 'pending' }).lean().catch(() => null);
    if (!legacyDoc) throw new NotFoundException('legacy withdrawal not found or already decided');
    const providerId = legacyDoc.providerId || legacyDoc.provider_id;
    const amount = Number(legacyDoc.amount) || 0;

    // S9: never pay more than the provider's true available balance
    // (negative balances from post-payout refunds block new payouts).
    const bal = await this.ledger.providerBalance(providerId);
    if (amount > bal.available + 0.001) {
      throw new BadRequestException(`payout_exceeds_available: requested ${amount} SAR, available ${bal.available} SAR${bal.negative ? ' (provider has negative balance debt)' : ''}`);
    }

    // S14: large payouts require a maker-checker approval first
    const th = await this.approvals.thresholds();
    if (amount >= th.large_payout_sar) {
      const op = await this.approvals.request('large_payout', {
        withdrawal_id: id, provider_account_id: providerId, amount, source: 'legacy',
      }, admin?.id || 'admin', `large payout ${amount} SAR to provider ${providerId}`);
      return { success: false, routed_to_approval: true, operation_id: op.id, message: 'المبلغ كبير — تم إرسال العملية لموافقة أدمن آخر (maker-checker)' };
    }

    // Execute: mark paid + append the payout ledger entry (idempotent by ref).
    await this.withdrawalModel.findByIdAndUpdate(id, { status: 'completed', decided_at: new Date() });
    if (!(await this.ledger.exists('payout', 'withdrawal', id))) {
      await this.ledger.append({
        type: 'payout', amount, provider_account_id: providerId,
        ref_type: 'withdrawal', ref_id: id,
        description: `Payout executed by ${admin?.id || 'admin'}`,
        actor_id: admin?.id,
      });
    }
    return { success: true, message: 'Payout executed successfully', amount, provider_id: providerId, available_after: (await this.ledger.providerBalance(providerId)).available, source: 'legacy' };
  }

  @RequirePermissions(Permission.FINANCE_PAYOUT_APPROVE)
  @Post('withdrawals/:id/reject')
  async rejectPayout(@Param('id') id: string, @Body() _body: RejectPayoutDto) {
    // Legacy rows are keyed by Mongo `_id`. A provider's withdrawal request is rejected through POST payouts/:id/reject.
    const legacy = await this.withdrawalModel.findOneAndUpdate({ _id: id, status: 'pending' }, { status: 'rejected' }, { new: true }).catch(() => null);
    if (!legacy) throw new NotFoundException('legacy withdrawal not found or already decided');
    return { success: true, withdrawal: legacy, source: 'legacy' };
  }
}
