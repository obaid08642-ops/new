import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { WalletDocument, WalletTransactionDocument } from '../../schemas/wallet.schema';
import { UserDocument } from '../../schemas/user.schema';
import { WalletRepository } from "./repositories/wallet.repository";
import { WalletTransactionRepository } from "./repositories/wallettransaction.repository";
import { UserRepository } from "./repositories/user.repository";

@Injectable()
export class WalletService {
  constructor(
    @Inject('WalletRepository') private walletModel: WalletRepository,
    @Inject('WalletTransactionRepository') private txModel: WalletTransactionRepository,
    @Inject('UserRepository') private userModel: UserRepository,
  ) {}

  async getOrCreateWallet(ownerId: string, ownerType: 'patient' | 'provider'): Promise<WalletDocument> {
    let wallet = await this.walletModel.findOne({ ownerId, ownerType });
    if (!wallet) {
      wallet = await this.walletModel.create({
        ownerId,
        ownerType,
        balance: 1000, // Default signup credit for sandbox testing
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

  async topup(ownerId: string, ownerType: 'patient' | 'provider', amount: number, description = 'شحن الرصيد'): Promise<WalletDocument> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getOrCreateWallet(ownerId, ownerType);
    wallet.balance += amount;
    await wallet.save();

    await this.txModel.create({
      walletId: wallet.id,
      amount,
      type: 'credit',
      referenceType: 'referral',
      referenceId: uuid(),
      description,
    });

    return wallet;
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

    // Deduct from sender
    senderWallet.balance -= amount;
    await senderWallet.save();

    // Add to recipient
    recipientWallet.balance += amount;
    await recipientWallet.save();

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
    const commission = consultationAmount * 0.15; // 15% Nabdah Commission
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
      description: 'عمولة منصة نبض (15%) - دفع بالعيادة'
    });

    // Suspension check: If debt exceeds 500 SAR (-500 balance), suspend account
    if (wallet.balance <= -500) {
      await this.userModel.findOneAndUpdate({ id: providerId }, { $set: { active: false } });
    }

    return wallet;
  }

  async addInsuranceEscrow(providerId: string, insuranceAmount: number) {
    const wallet = await this.getOrCreateWallet(providerId, 'provider');
    // Ensure escrow balance exists on schema (mocked via transaction here or schema addition)
    // We will just log a pending credit transaction for B2B settlement
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
    const newCard = {
      id: uuid(),
      type: cardData.type || 'visa',
      last4: cardData.cardNumber?.slice(-4) || '0000',
      holderName: cardData.holderName || 'Card Holder',
      expiry: cardData.expiry || '12/30',
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

  async getSpendingData(ownerId: string, ownerType: 'patient' | 'provider') {
    return [
      { category: 'صيدلية', amount: 350, color: '#16A34A' },
      { category: 'استشارات', amount: 800, color: '#23B5CE' },
      { تحاليل: 'مختبر', amount: 200, color: '#7A6BEA' }
    ];
  }
}
