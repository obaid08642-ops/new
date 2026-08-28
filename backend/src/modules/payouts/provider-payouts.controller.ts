/** Provider-initiated withdrawal requests with an atomic ledger reservation. */
import { Controller, Post, Get, Body, UseGuards, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { LedgerService } from '../finance-engine/finance-engine.module';

@Controller('provider/payouts')
@UseGuards(JwtAuthGuard)
export class ProviderPayoutsController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly ledger: LedgerService,
  ) {}

  private get withdrawals() { return this.conn.collection('providerwithdrawals'); }
  private get ledgerEntries() { return this.conn.collection('platformledgerentries'); }

  private assertPharmacySettlementReady(user: any): void {
    if (String(user?.role || '').toLowerCase() === 'pharmacy') {
      throw new ServiceUnavailableException('pharmacy_settlement_proof_required');
    }
  }

  private validateIban(iban: string | null | undefined): string {
    if (!iban) throw new BadRequestException('verified_bank_account_required');
    const clean = String(iban).replace(/\s+/g, '').toUpperCase();
    if (!/^SA\d{22}$/.test(clean)) throw new BadRequestException('invalid_verified_iban');
    return clean;
  }

  private async balanceForReservation(providerId: string, session: ClientSession) {
    const rows: any[] = await this.ledgerEntries.aggregate([
      { $match: { provider_account_id: providerId } },
      { $group: { _id: null,
        earned_cleared: { $sum: { $cond: [{ $and: [{ $in: ['$type', ['provider_earning', 'bonus', 'referral']] }, { $eq: ['$state', 'cleared'] }] }, '$amount', 0] } },
        earned_pending: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'provider_earning'] }, { $eq: ['$state', 'pending'] }] }, '$amount', 0] } },
        debits: { $sum: { $cond: [{ $in: ['$type', ['provider_debit', 'penalty', 'chargeback']] }, '$amount', 0] } },
        paid: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'payout'] }, { $eq: ['$state', 'cleared'] }] }, '$amount', 0] } },
        locked: { $sum: { $cond: [{ $eq: ['$state', 'locked'] }, '$amount', 0] } },
      } },
    ] as any, { session }).toArray();
    const row: any = rows[0] || {};
    return {
      available: Math.round(((row.earned_cleared || 0) - (row.paid || 0) - (row.debits || 0) - (row.locked || 0)) * 100) / 100,
      pending: Math.round((row.earned_pending || 0) * 100) / 100,
    };
  }

  @Post('request')
  async request(@CurrentUser() user: any, @Body() body: { amount?: number; idempotency_key?: string }) {
    this.assertPharmacySettlementReady(user);
    const amount = Math.round(Number(body?.amount) * 100) / 100;
    const idempotencyKey = String(body?.idempotency_key || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('valid_amount_required');
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) throw new BadRequestException('idempotency_key_required');

    await this.withdrawals.createIndex({ provider_id: 1, idempotency_key: 1 }, {
      unique: true, partialFilterExpression: { idempotency_key: { $exists: true } },
    });
    const previous: any = await this.withdrawals.findOne({ provider_id: user.id, idempotency_key: idempotencyKey });
    if (previous) return { ok: true, idempotent: true, request: previous, reference: previous.reference };

    const bank: any = await this.conn.collection('provider_bank_accounts').findOne({ account_id: user.id, review_status: 'approved' });
    if (!bank) throw new BadRequestException('verified_bank_account_required');
    const iban = this.validateIban(bank.iban);
    const minimum = (await this.conn.collection('finance_config').findOne({ key: 'commissions' }))?.payout_schedule?.minimum_payout_sar ?? 100;
    const session = await this.conn.startSession();
    try {
      let response: any;
      await session.withTransaction(async () => {
        const existing: any = await this.withdrawals.findOne({ provider_id: user.id, idempotency_key: idempotencyKey }, { session });
        if (existing) {
          response = { ok: true, idempotent: true, request: existing, reference: existing.reference };
          return;
        }
        const balance = await this.balanceForReservation(user.id, session);
        if (balance.available < 0) throw new BadRequestException('negative_balance');
        if (amount < minimum) throw new BadRequestException(`minimum_withdrawal_${minimum}`);
        if (amount > balance.available) throw new BadRequestException('insufficient_available_balance');
        const pending = await this.withdrawals.findOne({ provider_id: user.id, state: { $in: ['PENDING_ADMIN_APPROVAL', 'APPROVED_FOR_PAYOUT'] } }, { session });
        if (pending) throw new BadRequestException('pending_withdrawal_exists');

        const id = `wd_${uuid()}`;
        const now = new Date();
        const request = {
          id, provider_id: user.id, provider_type: user.role, amount, iban, bank_name: bank.bank_name,
          bank_account_id: String(bank._id || bank.id || ''), bank_review_status: 'approved',
          state: 'PENDING_ADMIN_APPROVAL', reference: `PAYOUT-${id.slice(-12).toUpperCase()}`,
          idempotency_key: idempotencyKey, balance_at_request: balance.available,
          escrow_pending_at_request: balance.pending, reservation_state: 'locked', createdAt: now, updatedAt: now,
        };
        await this.withdrawals.insertOne(request as any, { session });
        await this.ledgerEntries.insertOne({
          id: `le_${id}`, provider_account_id: user.id, type: 'payout', state: 'locked', amount,
          ref_type: 'withdrawal_reservation', ref_id: id, description: `Withdrawal reserved ${request.reference}`,
          actor_id: user.id, meta: { withdrawal_id: id, bank_account_id: request.bank_account_id }, createdAt: now,
        } as any, { session });
        response = {
          ok: true, request, reference: request.reference,
          available_balance: Math.round((balance.available - amount) * 100) / 100,
          escrow_pending: balance.pending, minimum,
        };
      });
      return response;
    } catch (error: any) {
      if (error?.code === 11000) {
        const existing: any = await this.withdrawals.findOne({ provider_id: user.id, idempotency_key: idempotencyKey });
        if (existing) return { ok: true, idempotent: true, request: existing, reference: existing.reference };
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  @Get('mine')
  mine(@CurrentUser() user: any): Promise<any[]> {
    return this.withdrawals.find({ provider_id: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
  }

  @Get('balance')
  balance(@CurrentUser() user: any) {
    this.assertPharmacySettlementReady(user);
    return this.ledger.providerBalance(user.id);
  }
}
