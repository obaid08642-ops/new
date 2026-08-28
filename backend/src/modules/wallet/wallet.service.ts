import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { WalletDocument, WalletTransactionDocument } from '../../schemas/wallet.schema';
import { UserDocument } from '../../schemas/user.schema';
import { WalletRepository } from "./repositories/wallet.repository";
import { WalletTransactionRepository } from "./repositories/wallettransaction.repository";
import { UserRepository } from "./repositories/user.repository";
import { MoyasarService } from '../moyasar/moyasar.module';

@Injectable()
export class WalletService {
  constructor(
    @Inject('WalletRepository') private walletModel: WalletRepository,
    @Inject('WalletTransactionRepository') private txModel: WalletTransactionRepository,
    @Inject('UserRepository') private userModel: UserRepository,
    @InjectConnection() private readonly conn: Connection,
    private readonly moyasar: MoyasarService,
  ) {}

  private async commissionPercent(serviceType: string): Promise<number> {
    const cfg: any = await this.conn.db.collection('finance_config').findOne({ key: 'commissions' });
    return cfg?.service_types?.[serviceType]?.percent ?? 15;
  }

  private async debtSuspensionThreshold(): Promise<number> {
    const cfg: any = await this.conn.db.collection('finance_config').findOne({ key: 'commissions' });
    return cfg?.payout_schedule?.debt_suspension_threshold_sar ?? 500;
  }

  async getOrCreateWallet(ownerId: string, ownerType: 'patient' | 'provider'): Promise<WalletDocument> {
    let wallet = await this.walletModel.findOne({ ownerId, ownerType });
    if (!wallet) {
      wallet = await this.walletModel.create({
        ownerId,
        ownerType,
        balance: 0, // Production: wallets start empty — real money only via real transactions
      });
    }
    return wallet;
  }

  async getBalance(ownerId: string, ownerType: 'patient' | 'provider'): Promise<number> {
    const wallet = await this.getOrCreateWallet(ownerId, ownerType);
    return wallet.balance;
  }

  async getTransactions(ownerId: string, ownerType: 'patient' | 'provider', page = 1, limit = 20) {
    const wallet = await this.getOrCreateWallet(ownerId, ownerType);
    const total = await this.txModel.countDocuments({ walletId: wallet.id });
    const transactions = await this.txModel
      .find({ walletId: wallet.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { transactions, total };
  }

  /**
   * INTERNAL credit — refunds, adjustments, referral bonuses.
   * NEVER exposed directly to clients: real-money top-ups must go through
   * createTopupIntent + confirmTopup (gateway-verified) below.
   */
  async topup(ownerId: string, ownerType: 'patient' | 'provider', amount: number, description = 'شحن الرصيد', refType = 'adjustment', refId?: string): Promise<WalletDocument> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getOrCreateWallet(ownerId, ownerType);
    wallet.balance += amount;
    await wallet.save();

    await this.txModel.create({
      walletId: wallet.id,
      amount,
      type: 'credit',
      referenceType: refType as any,
      referenceId: refId || uuid(),
      description,
    });

    return wallet;
  }

  // ============ Gateway-backed wallet top-up (E1-F1) ============
  /**
   * Step 1: create a pending top-up + a REAL Moyasar payment for the amount.
   * Balance is NOT touched here — only after the gateway confirms payment.
   */
  async createTopupIntent(ownerId: string, ownerType: 'patient' | 'provider', amount: number) {
    const amt = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(amt) || amt <= 0) throw new BadRequestException('amount_must_be_positive');
    if (amt > 50000) throw new BadRequestException('amount_exceeds_topup_limit');

    // Reuse an existing unpaid intent instead of creating duplicate charges
    const existing: any = await this.conn.collection('wallet_topups').findOne(
      { user_id: ownerId, status: 'pending_payment' },
      { sort: { createdAt: -1 } } as any,
    );
    if (existing && Math.abs(existing.amount - amt) < 0.001 && existing.moyasar_id) {
      // Check it hasn't expired at the gateway
      const synced = await this.moyasar.syncPaymentStatus(existing.moyasar_id).catch(() => null);
      if (synced && (synced as any).status === 'initiated') {
        return { topup_id: existing.id, amount: existing.amount, status: 'pending_payment', moyasar_id: existing.moyasar_id, payment_url: existing.payment_url };
      }
    }

    const topupId = `wt_${uuid()}`;
    const payment = await this.moyasar.createPayment({
      bookingId: topupId,
      bookingKind: 'wallet_topup',
      patientId: ownerId,
      amount: amt,
      description: `Nabd wallet top-up ${amt} SAR`,
      metadata: { wallet_topup: true },
      skipBookingValidation: true, // amount is user-chosen by design for top-ups
    } as any);

    await this.conn.collection('wallet_topups').insertOne({
      id: topupId,
      user_id: ownerId,
      owner_type: ownerType,
      amount: amt,
      status: 'pending_payment',
      moyasar_id: (payment as any).moyasar_id,
      payment_url: (payment as any).payment_url,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    return {
      topup_id: topupId,
      amount: amt,
      status: 'pending_payment',
      moyasar_id: (payment as any).moyasar_id,
      payment_url: (payment as any).payment_url,
    };
  }

  /**
   * Step 2: confirm with the gateway; credit the wallet exactly once.
   * Atomic status transition pending_payment → credited prevents double-credit races.
   */
  async confirmTopup(ownerId: string, topupId: string) {
    const topup: any = await this.conn.collection('wallet_topups').findOne({ id: topupId } as any);
    if (!topup) throw new NotFoundException('topup_not_found');
    if (topup.user_id !== ownerId) throw new ForbiddenException('not_your_topup');
    if (topup.status === 'credited') {
      const wallet = await this.getOrCreateWallet(ownerId, topup.owner_type || 'patient');
      return { topup_id: topupId, status: 'credited', amount: topup.amount, balance: wallet.balance };
    }

    const synced: any = await this.moyasar.syncPaymentStatus(topup.moyasar_id);
    if (!synced || synced.status !== 'paid') {
      await this.conn.collection('wallet_topups').updateOne(
        { id: topupId } as any,
        { $set: { status: synced?.status === 'failed' ? 'failed' : 'pending_payment', updatedAt: new Date() } },
      );
      return { topup_id: topupId, status: synced?.status || 'pending_payment', amount: topup.amount };
    }

    // Atomic claim: only the first caller flips pending_payment → credited.
    // Driver v6 returns the doc directly; older drivers wrap it in { value }.
    const claimedRaw: any = await this.conn.collection('wallet_topups').findOneAndUpdate(
      { id: topupId, status: 'pending_payment' } as any,
      { $set: { status: 'credited', credited_at: new Date(), updatedAt: new Date() } },
    );
    const claimedDoc: any = claimedRaw?.value !== undefined ? claimedRaw.value : claimedRaw;
    if (!claimedDoc) {
      // Already credited by a concurrent/request retry — report current state
      const wallet = await this.getOrCreateWallet(ownerId, topup.owner_type || 'patient');
      return { topup_id: topupId, status: 'credited', amount: topup.amount, balance: wallet.balance };
    }

    const wallet = await this.topup(ownerId, topup.owner_type || 'patient', topup.amount, 'شحن المحفظة (دفع إلكتروني)', 'topup', topupId);
    return { topup_id: topupId, status: 'credited', amount: topup.amount, balance: wallet.balance };
  }

  async getTopup(ownerId: string, topupId: string) {
    const topup: any = await this.conn.collection('wallet_topups').findOne({ id: topupId } as any, { projection: { _id: 0 } } as any);
    if (!topup) throw new NotFoundException('topup_not_found');
    if (topup.user_id !== ownerId) throw new ForbiddenException('not_your_topup');
    return topup;
  }

  async transfer(senderId: string, ownerType: 'patient' | 'provider', recipientQuery: string, amount: number): Promise<WalletDocument> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const senderWallet = await this.getOrCreateWallet(senderId, ownerType);
    if (senderWallet.balance < amount) {
      throw new BadRequestException('insufficient_balance');
    }

    // Find recipient user
    const recipientUser = await this.userModel.findOne({
      $or: [
        { id: recipientQuery },
        { phone: recipientQuery },
        { email: recipientQuery },
      ],
    });
    if (!recipientUser) {
      throw new NotFoundException('recipient_user_not_found');
    }
    if (recipientUser.id === senderId) {
      throw new BadRequestException('cannot_transfer_to_self');
    }

    const recipientWallet = await this.getOrCreateWallet(recipientUser.id, recipientUser.role === 'patient' ? 'patient' : 'provider');

    // S7: ATOMIC debit — the balance>=amount guard lives INSIDE the update, so two
    // concurrent transfers can never both pass the check (double-spend race).
    const debited = await this.walletModel.updateOne(
      { _id: senderWallet._id, balance: { $gte: amount } } as any,
      { $inc: { balance: -amount }, $set: { updatedAt: new Date() } },
    );
    if (!debited.modifiedCount) throw new BadRequestException('insufficient_balance');

    // Add to recipient (atomic increment)
    await this.walletModel.updateOne(
      { _id: recipientWallet._id } as any,
      { $inc: { balance: amount }, $set: { updatedAt: new Date() } },
    );
    senderWallet.balance -= amount; // keep the returned doc consistent

    const refId = uuid();

    // Create debit tx
    await this.txModel.create({
      walletId: senderWallet.id,
      amount,
      type: 'debit',
      referenceType: 'booking',
      referenceId: refId,
      description: `تحويل إلى ${recipientUser.full_name || recipientQuery}`,
    });

    // Create credit tx
    await this.txModel.create({
      walletId: recipientWallet.id,
      amount,
      type: 'credit',
      referenceType: 'refund',
      referenceId: refId,
      description: `تحويل من حساب ${senderId.substring(0, 8)}...`,
    });

    return senderWallet;
  }


  // ============ V3.0 Doctor Commission & Ledger Logic ============
  async addCommissionDebt(providerId: string, consultationAmount: number) {
    const percent = await this.commissionPercent('consultation');
    const commission = consultationAmount * (percent / 100);
    const wallet = await this.getOrCreateWallet(providerId, 'provider');
    
    // Decrease balance (negative balance represents debt to Nabdah)
    wallet.balance -= commission;
    await wallet.save();

    await this.txModel.create({
      walletId: wallet.id,
      amount: commission,
      type: 'debit',
      referenceType: 'commission',
      referenceId: uuid(),
      description: `عمولة منصة نبض (${percent}%) - دفع بالعيادة`
    });

    // Suspension check: debt beyond the configured threshold suspends the account
    const threshold = await this.debtSuspensionThreshold();
    if (wallet.balance <= -threshold) {
      await this.userModel.findOneAndUpdate({ id: providerId }, { $set: { active: false } });
    }

    return wallet;
  }

  async addInsuranceEscrow(providerId: string, insuranceAmount: number) {
    const wallet = await this.getOrCreateWallet(providerId, 'provider');
    // Escrow is recorded as a pending credit transaction for B2B settlement;
    // it is intentionally NOT added to the available balance until settlement runs
    await this.txModel.create({
      walletId: wallet.id,
      amount: insuranceAmount,
      type: 'credit',
      referenceType: 'insurance_escrow',
      referenceId: uuid(),
      description: 'مبالغ معلقة (تأمين)' // Not yet added to main balance until settlement
    });
    return wallet;
  }

  async getCards(ownerId: string, ownerType: 'patient' | 'provider') {
    const wallet = await this.getOrCreateWallet(ownerId, ownerType);
    return wallet.savedCards || [];
  }

  async addCard(ownerId: string, ownerType: 'patient' | 'provider', cardData: any) {
    const wallet = await this.getOrCreateWallet(ownerId, ownerType);
    const last4 = String(cardData?.last4 || cardData?.cardNumber?.slice(-4) || '');
    if (!/^\d{4}$/.test(last4)) throw new BadRequestException('card last4 required');
    if (!cardData?.holderName || !String(cardData.holderName).trim()) throw new BadRequestException('card holder name required');
    if (!/^\d{2}\/\d{2}$/.test(String(cardData?.expiry || ''))) throw new BadRequestException('card expiry (MM/YY) required');
    const newCard = {
      id: uuid(),
      type: cardData.type || 'visa',
      last4,
      holderName: String(cardData.holderName).trim(),
      expiry: String(cardData.expiry),
      isDefault: wallet.savedCards?.length === 0,
      gradient: cardData.type === 'mada' ? ['#1E293B', '#475569'] : ['#23B5CE', '#8FD4E3'],
    };
    wallet.savedCards.push(newCard);
    await wallet.save();
    return wallet.savedCards;
  }

  async removeCard(ownerId: string, ownerType: 'patient' | 'provider', cardId: string) {
    const wallet = await this.getOrCreateWallet(ownerId, ownerType);
    wallet.savedCards = wallet.savedCards.filter((c: any) => c.id !== cardId);
    if (wallet.savedCards.length > 0 && !wallet.savedCards.find((c: any) => c.isDefault)) {
      wallet.savedCards[0].isDefault = true;
    }
    await wallet.save();
    return wallet.savedCards;
  }

  /** Real spending breakdown: debits grouped by reference type over the last 90 days. */
  async getSpendingData(ownerId: string, ownerType: 'patient' | 'provider') {
    const wallet = await this.walletModel.findOne({ ownerId, ownerType });
    if (!wallet) return [];
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const rows = await (this.txModel as any).model.aggregate([
      { $match: { walletId: wallet.id, type: 'debit', createdAt: { $gte: since } } },
      { $group: { _id: '$referenceType', total: { $sum: '$amount' } } },
    ]);
    const META: Record<string, { category: string; color: string }> = {
      booking: { category: 'حجوزات وخدمات', color: '#23B5CE' },
      commission: { category: 'عمولات المنصة', color: '#7A6BEA' },
      refund: { category: 'استردادات', color: '#F0A526' },
      referral: { category: 'إحالات', color: '#16A34A' },
      insurance_escrow: { category: 'تأمين', color: '#F0695C' },
    };
    return rows
      .filter((r: any) => r.total > 0)
      .map((r: any) => ({
        category: META[r._id]?.category || r._id || 'أخرى',
        amount: Math.round(r.total * 100) / 100,
        color: META[r._id]?.color || '#94A3B8',
      }))
      .sort((a: any, b: any) => b.amount - a.amount);
  }
}
