/**
 * Provider-initiated withdrawal requests — providers request payouts;
 * admin executes/rejects (existing finance.controller flow).
 *
 * E1 S7/S8/S9: balance now comes from the canonical ledger decomposition
 * (escrow-matured, debit-aware, NEVER clamped — a negative balance means
 * the provider owes the platform and cannot withdraw), Saudi IBANs are
 * validated, and pending escrow is reported separately.
 */
import { Controller, Post, Get, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { LedgerService } from '../finance-engine/finance-engine.module';

@Controller('provider/payouts')
@UseGuards(JwtAuthGuard)
export class ProviderPayoutsController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly ledger: LedgerService,
  ) {}

  private get withdrawals() { return this.conn.collection('withdrawals'); }

  /** Saudi IBAN: SA + 22 digits (S7). */
  private validateIban(iban: string | null | undefined): string {
    if (!iban) throw new BadRequestException('iban_required — أضف الآيبان في ملفك أو أرسله مع الطلب');
    const clean = String(iban).replace(/\s+/g, '').toUpperCase();
    if (!/^SA\d{22}$/.test(clean)) throw new BadRequestException('invalid_iban — الآيبان السعودي يجب أن يكون SA متبوعًا بـ 22 رقمًا');
    return clean;
  }

  @Post('request')
  async request(@CurrentUser() user: any, @Body() body: { amount?: number; iban?: string }) {
    const bal = await this.ledger.providerBalance(user.id);
    const balance = bal.available;

    const minimum = (await this.conn.collection('finance_config').findOne({ key: 'commissions' }))?.payout_schedule?.minimum_payout_sar ?? 100;
    const amount = body?.amount ?? balance;

    if (bal.negative) {
      throw new BadRequestException(`negative_balance: your balance is ${balance} SAR due to refunds/adjustments — new earnings will settle the debt first`);
    }
    if (amount < minimum) {
      throw new BadRequestException(`minimum withdrawal is ${minimum} SAR (your available balance: ${balance}, in escrow: ${bal.pending})`);
    }
    if (amount > balance) {
      throw new BadRequestException(`insufficient available balance (${balance} SAR; ${bal.pending} SAR still in escrow)`);
    }

    const pending = await this.withdrawals.findOne({ provider_id: user.id, status: 'pending' });
    if (pending) throw new BadRequestException('you already have a pending withdrawal request');

    const profile: any = await this.conn.collection('provider_profiles').findOne(
      { $or: [{ user_id: user.id }, { account_id: user.id }] } as any,
    );
    // IBAN priority: request body → profile → verified/pending bank account record
    let ibanSource = body?.iban || profile?.iban;
    let bankHolder = profile?.bank_account_name || null;
    if (!ibanSource) {
      const bank: any = await this.conn.collection('provider_bank_accounts').findOne({ account_id: user.id });
      ibanSource = bank?.iban;
      bankHolder = bankHolder || bank?.holder_name || null;
    }
    const iban = this.validateIban(ibanSource);

    const doc = {
      id: `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      provider_id: user.id,
      provider_type: user.role,
      amount,
      iban,
      bank_account_name: bankHolder,
      status: 'pending',
      balance_at_request: balance,
      escrow_pending_at_request: bal.pending,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.withdrawals.insertOne(doc);
    return { ok: true, request: doc, available_balance: balance, escrow_pending: bal.pending, minimum };
  }

  @Get('mine')
  mine(@CurrentUser() user: any): Promise<any[]> {
    return this.withdrawals.find({ provider_id: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
  }

  /** Full balance decomposition for the provider app (S7/S8). */
  @Get('balance')
  balance(@CurrentUser() user: any) {
    return this.ledger.providerBalance(user.id);
  }
}
