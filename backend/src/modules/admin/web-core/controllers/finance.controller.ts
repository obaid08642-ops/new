import { Body, Controller, Get, NotFoundException, BadRequestException, Param, Post, Put } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { CommissionLedger } from '../schemas/commission-ledger.schema';
import { WithdrawalRequest } from '../schemas/withdrawal-request.schema';
import { LedgerService, ApprovalService } from '../../../finance-engine/finance-engine.module';
import { CurrentUser, Roles } from '../../../../common/auth.guard';
import { UserRole } from '../../../../common/enums';
import { RejectPayoutDto } from './finance.dto';

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
@Roles(UserRole.ADMIN)
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
    // Live platform config (finance_config key 'commissions'): service percents,
    // escrow settlement delays, payout schedule and VAT. Returned alongside the
    // legacy ledger rows so one call drives the commissions screen and tests.
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' } as any).catch(() => null);
    return { data, service_types: cfg?.service_types || {}, settlement: cfg?.settlement || {}, payout_schedule: cfg?.payout_schedule || {}, tax: cfg?.tax || {} };
  }

  /** Merge platform finance config (whitelisted keys only, audited). Used by the
   * commissions screen and by live tests to set the escrow hold to 0. */
  @Put('commissions')
  async updateCommissions(@Body() body: any, @CurrentUser() admin: any) {
    const patch: any = {};
    if (body?.service_types !== undefined) {
      if (!body.service_types || typeof body.service_types !== 'object' || Array.isArray(body.service_types)) {
        throw new BadRequestException('service_types must be an object');
      }
      for (const [kind, rule] of Object.entries(body.service_types as Record<string, any>)) {
        const pct = Number((rule as any)?.percent);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new BadRequestException(`service_types.${kind}.percent must be 0-100`);
      }
      patch.service_types = body.service_types;
    }
    if (body?.settlement !== undefined) {
      const delays = body.settlement?.delay_days;
      if (!delays || typeof delays !== 'object' || Array.isArray(delays)) throw new BadRequestException('settlement.delay_days must be an object');
      for (const [kind, days] of Object.entries(delays as Record<string, any>)) {
        const n = Number(days);
        if (!Number.isInteger(n) || n < 0 || n > 30) throw new BadRequestException(`settlement.delay_days.${kind} must be an integer 0-30`);
      }
      patch.settlement = body.settlement;
    }
    if (body?.payout_schedule !== undefined) {
      const min = Number(body.payout_schedule?.minimum_payout_sar);
      if (body.payout_schedule?.minimum_payout_sar !== undefined && (!Number.isFinite(min) || min < 0)) {
        throw new BadRequestException('payout_schedule.minimum_payout_sar must be non-negative');
      }
      patch.payout_schedule = body.payout_schedule;
    }
    if (body?.tax !== undefined) {
      const vat = Number(body.tax?.vat_percent);
      if (body.tax?.vat_percent !== undefined && (!Number.isFinite(vat) || vat < 0 || vat > 100)) {
        throw new BadRequestException('tax.vat_percent must be 0-100');
      }
      patch.tax = body.tax;
    }
    if (!Object.keys(patch).length) throw new BadRequestException('no configurable keys supplied (allowed: service_types, settlement, payout_schedule, tax)');
    const col = this.conn.collection('finance_config');
    const existing: any = await col.findOne({ key: 'commissions' } as any).catch(() => null);
    const now = new Date();
    await col.updateOne(
      { key: 'commissions' } as any,
      {
        $set: {
          key: 'commissions',
          service_types: { ...(existing?.service_types || {}), ...(patch.service_types || {}) },
          settlement: { ...(existing?.settlement || {}), ...(patch.settlement || {}) },
          payout_schedule: { ...(existing?.payout_schedule || {}), ...(patch.payout_schedule || {}) },
          tax: { ...(existing?.tax || {}), ...(patch.tax || {}) },
          updated_at: now, updated_by: admin?.id,
        },
        $push: { audit: { at: now, by: admin?.id, changes: patch } } as any,
      },
      { upsert: true },
    );
    return this.getCommissions();
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
    // Legacy withdrawals are keyed by Mongo `_id`; provider-ops withdrawals
    // fall back to the public uuid `id` below — both paths 404 when absent.
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

    // Execute: mark paid + append the payout ledger entry (idempotent by ref).
    // legacyDoc is only set from the legacy `_id` lookup above.
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
  async rejectPayout(@Param('id') id: string, @Body() body: RejectPayoutDto) {
    // Legacy withdrawals are keyed by Mongo `_id`; provider-ops withdrawals
    // fall back to the public uuid `id` below — both paths 404 when absent.
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
