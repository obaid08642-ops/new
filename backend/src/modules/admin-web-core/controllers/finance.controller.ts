import { Body, Controller, Get, NotFoundException, BadRequestException, Param, Post } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { CommissionLedger } from '../schemas/commission-ledger.schema';
import { WithdrawalRequest } from '../schemas/withdrawal-request.schema';
import { LedgerService, ApprovalService } from '../../finance-engine/finance-engine.module';
import { CurrentUser } from '../../../common/auth.guard';

/**
 * M5 fix: provider withdrawals written by provider-ops (`ProviderWithdrawal`,
 * state PENDING_ADMIN_APPROVAL) were invisible to this controller which read
 * only the legacy `WithdrawalRequest` (status 'pending'). Both collections are
 * now merged in a normalized shape, and execute/reject handle either source.
 *
 * E1 S7/S9/S14: executing a payout now APPENDS a 'payout' ledger entry
 * (previously the ledger was never debited — the same money could be paid
 * out twice), rejects payouts that exceed the provider's real available
 * balance (incl. negative-balance debt), and routes large payouts through
 * maker-checker approval.
 */
@Controller('admin/finance')
export class FinanceController {
  constructor(
    @InjectModel(CommissionLedger.name) private commissionModel: Model<CommissionLedger>,
    @InjectModel(WithdrawalRequest.name) private withdrawalModel: Model<WithdrawalRequest>,
    @InjectModel('ProviderWithdrawal') private providerWithdrawalModel: Model<any>,
    @InjectConnection() private readonly conn: Connection,
    private readonly ledger: LedgerService,
    private readonly approvals: ApprovalService,
  ) {}

  @Get('commissions')
  async getCommissions() {
    const data = await this.commissionModel.find().exec();
    return { data };
  }

  @Get('withdrawals/pending')
  async getPendingWithdrawals() {
    const [legacy, providerOps] = await Promise.all([
      this.withdrawalModel.find({ status: 'pending' }).lean().exec(),
      this.providerWithdrawalModel.find({ state: 'PENDING_ADMIN_APPROVAL' }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean().exec(),
    ]);
    const normalized = [
      ...(legacy || []).map((w: any) => ({
        id: String(w._id),
        source: 'legacy',
        providerId: w.providerId || w.provider_id,
        providerName: w.providerName || w.provider_name,
        amount: w.amount,
        bankName: w.bankName,
        iban: w.iban,
        status: 'pending',
        createdAt: w.createdAt,
      })),
      ...(providerOps || []).map((w: any) => ({
        id: w.id,
        source: 'provider_ops',
        providerId: w.provider_id,
        providerName: w.provider_name,
        amount: w.amount,
        iban: w.iban,
        note: w.note,
        status: 'pending',
        createdAt: w.createdAt,
      })),
    ].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return { data: normalized };
  }

  @Post('withdrawals/:id/execute')
  async executePayout(@Param('id') id: string, @CurrentUser() admin: any) {
    // Resolve the withdrawal WITHOUT mutating it first — we must validate
    // the provider's real balance and large-payout approval before paying.
    const legacyDoc: any = await this.withdrawalModel.findById(id).lean().catch(() => null);
    const opsDoc: any = legacyDoc ? null : await this.providerWithdrawalModel.findOne({ id, state: 'PENDING_ADMIN_APPROVAL' }, { _id: 0, __v: 0 }).lean();
    if (!legacyDoc && !opsDoc) throw new NotFoundException('withdrawal not found or already decided');

    const providerId = legacyDoc ? (legacyDoc.providerId || legacyDoc.provider_id) : opsDoc.provider_id;
    const amount = Number(legacyDoc ? legacyDoc.amount : opsDoc.amount) || 0;

    // S9: never pay more than the provider's true available balance
    // (negative balances from post-payout refunds block new payouts).
    const bal = await this.ledger.providerBalance(providerId);
    const reservation: any = opsDoc
      ? await this.conn.collection('platformledgerentries').findOne({ type: 'payout', state: 'locked', ref_type: 'withdrawal_reservation', ref_id: id, provider_account_id: providerId })
      : null;
    if (opsDoc && (!reservation || Number(reservation.amount) !== amount)) {
      throw new BadRequestException('withdrawal_reservation_missing_or_mismatched');
    }
    const executableBalance = bal.available + (reservation ? Number(reservation.amount) : 0);
    if (amount > executableBalance + 0.001) {
      throw new BadRequestException(`payout_exceeds_available: requested ${amount} SAR, available ${executableBalance} SAR${bal.negative ? ' (provider has negative balance debt)' : ''}`);
    }

    // S14: large payouts require a maker-checker approval first
    const th = await this.approvals.thresholds();
    if (amount >= th.large_payout_sar) {
      const op = await this.approvals.request('large_payout', {
        withdrawal_id: id, provider_account_id: providerId, amount,
        source: legacyDoc ? 'legacy' : 'provider_ops',
      }, admin?.id || 'admin', `large payout ${amount} SAR to provider ${providerId}`);
      return { success: false, routed_to_approval: true, operation_id: op.id, message: 'المبلغ كبير — تم إرسال العملية لموافقة أدمن آخر (maker-checker)' };
    }

    // Execute: mark paid + append the payout ledger entry (idempotent by ref)
    if (legacyDoc) {
      await this.withdrawalModel.findByIdAndUpdate(id, { status: 'completed', decided_at: new Date() });
    } else {
      await this.providerWithdrawalModel.findOneAndUpdate(
        { id, state: 'PENDING_ADMIN_APPROVAL' },
        { $set: { state: 'PAID', decided_at: new Date() } },
      );
      await this.conn.collection('platformledgerentries').updateOne(
        { id: reservation.id, state: 'locked' },
        { $set: { state: 'cleared', cleared_at: new Date(), actor_id: admin?.id || 'admin' } },
      );
    }
    const dup = legacyDoc ? await this.ledger.exists('payout', 'withdrawal', id) : true;
    if (!dup) {
      await this.ledger.append({
        type: 'payout', amount, provider_account_id: providerId,
        ref_type: 'withdrawal', ref_id: id,
        description: `Payout executed by ${admin?.id || 'admin'}`,
        actor_id: admin?.id,
      });
    }
    return { success: true, message: 'Payout executed successfully', amount, provider_id: providerId, available_after: (await this.ledger.providerBalance(providerId)).available, source: legacyDoc ? 'legacy' : 'provider_ops' };
  }

  @Post('withdrawals/:id/reject')
  async rejectPayout(@Param('id') id: string, @Body() body: any) {
    const legacy = await this.withdrawalModel.findByIdAndUpdate(id, { status: 'rejected' }, { new: true }).catch(() => null);
    if (legacy) {
      return { success: true, withdrawal: legacy, source: 'legacy' };
    }
    const doc = await this.providerWithdrawalModel.findOneAndUpdate(
      { id, state: 'PENDING_ADMIN_APPROVAL' },
      { $set: { state: 'REJECTED', note: body?.reason || undefined, decided_at: new Date() } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('withdrawal not found or already decided');
    await this.conn.collection('platformledgerentries').updateOne(
      { type: 'payout', state: 'locked', ref_type: 'withdrawal_reservation', ref_id: id, provider_account_id: doc.provider_id },
      { $set: { state: 'released', released_at: new Date(), release_reason: body?.reason || 'admin_rejected' } },
    );
    return { success: true, withdrawal: doc, source: 'provider_ops' };
  }
}
