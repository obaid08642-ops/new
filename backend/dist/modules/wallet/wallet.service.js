"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const wallet_repository_1 = require("./repositories/wallet.repository");
const wallettransaction_repository_1 = require("./repositories/wallettransaction.repository");
const user_repository_1 = require("./repositories/user.repository");
const moyasar_module_1 = require("../moyasar/moyasar.module");
let WalletService = class WalletService {
    constructor(walletModel, txModel, userModel, conn, moyasar) {
        this.walletModel = walletModel;
        this.txModel = txModel;
        this.userModel = userModel;
        this.conn = conn;
        this.moyasar = moyasar;
    }
    async commissionPercent(serviceType) {
        const cfg = await this.conn.db.collection('finance_config').findOne({ key: 'commissions' });
        return cfg?.service_types?.[serviceType]?.percent ?? 15;
    }
    async debtSuspensionThreshold() {
        const cfg = await this.conn.db.collection('finance_config').findOne({ key: 'commissions' });
        return cfg?.payout_schedule?.debt_suspension_threshold_sar ?? 500;
    }
    async getOrCreateWallet(ownerId, ownerType) {
        let wallet = await this.walletModel.findOne({ ownerId, ownerType });
        if (!wallet) {
            wallet = await this.walletModel.create({
                ownerId,
                ownerType,
                balance: 0,
            });
        }
        return wallet;
    }
    async getBalance(ownerId, ownerType) {
        const wallet = await this.getOrCreateWallet(ownerId, ownerType);
        return wallet.balance;
    }
    async getTransactions(ownerId, ownerType, page = 1, limit = 20) {
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
    async topup(ownerId, ownerType, amount, description = 'شحن الرصيد', refType = 'adjustment', refId) {
        if (amount <= 0)
            throw new common_1.BadRequestException('Amount must be positive');
        const wallet = await this.getOrCreateWallet(ownerId, ownerType);
        wallet.balance += amount;
        await wallet.save();
        await this.txModel.create({
            walletId: wallet.id,
            amount,
            type: 'credit',
            referenceType: refType,
            referenceId: refId || (0, uuid_1.v4)(),
            description,
        });
        return wallet;
    }
    async createTopupIntent(ownerId, ownerType, amount) {
        const amt = Math.round(Number(amount) * 100) / 100;
        if (!Number.isFinite(amt) || amt <= 0)
            throw new common_1.BadRequestException('amount_must_be_positive');
        if (amt > 50000)
            throw new common_1.BadRequestException('amount_exceeds_topup_limit');
        const existing = await this.conn.collection('wallet_topups').findOne({ user_id: ownerId, status: 'pending_payment' }, { sort: { createdAt: -1 } });
        if (existing && Math.abs(existing.amount - amt) < 0.001 && existing.moyasar_id) {
            const synced = await this.moyasar.syncPaymentStatus(existing.moyasar_id).catch(() => null);
            if (synced && synced.status === 'initiated') {
                return { topup_id: existing.id, amount: existing.amount, status: 'pending_payment', moyasar_id: existing.moyasar_id, payment_url: existing.payment_url };
            }
        }
        const topupId = `wt_${(0, uuid_1.v4)()}`;
        const payment = await this.moyasar.createPayment({
            bookingId: topupId,
            bookingKind: 'wallet_topup',
            patientId: ownerId,
            amount: amt,
            description: `Nabd wallet top-up ${amt} SAR`,
            metadata: { wallet_topup: true },
            skipBookingValidation: true,
        });
        await this.conn.collection('wallet_topups').insertOne({
            id: topupId,
            user_id: ownerId,
            owner_type: ownerType,
            amount: amt,
            status: 'pending_payment',
            moyasar_id: payment.moyasar_id,
            payment_url: payment.payment_url,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return {
            topup_id: topupId,
            amount: amt,
            status: 'pending_payment',
            moyasar_id: payment.moyasar_id,
            payment_url: payment.payment_url,
        };
    }
    async confirmTopup(ownerId, topupId) {
        const topup = await this.conn.collection('wallet_topups').findOne({ id: topupId });
        if (!topup)
            throw new common_1.NotFoundException('topup_not_found');
        if (topup.user_id !== ownerId)
            throw new common_1.ForbiddenException('not_your_topup');
        if (topup.status === 'credited') {
            const wallet = await this.getOrCreateWallet(ownerId, topup.owner_type || 'patient');
            return { topup_id: topupId, status: 'credited', amount: topup.amount, balance: wallet.balance };
        }
        const synced = await this.moyasar.syncPaymentStatus(topup.moyasar_id);
        if (!synced || synced.status !== 'paid') {
            await this.conn.collection('wallet_topups').updateOne({ id: topupId }, { $set: { status: synced?.status === 'failed' ? 'failed' : 'pending_payment', updatedAt: new Date() } });
            return { topup_id: topupId, status: synced?.status || 'pending_payment', amount: topup.amount };
        }
        const claimedRaw = await this.conn.collection('wallet_topups').findOneAndUpdate({ id: topupId, status: 'pending_payment' }, { $set: { status: 'credited', credited_at: new Date(), updatedAt: new Date() } });
        const claimedDoc = claimedRaw?.value !== undefined ? claimedRaw.value : claimedRaw;
        if (!claimedDoc) {
            const wallet = await this.getOrCreateWallet(ownerId, topup.owner_type || 'patient');
            return { topup_id: topupId, status: 'credited', amount: topup.amount, balance: wallet.balance };
        }
        const wallet = await this.topup(ownerId, topup.owner_type || 'patient', topup.amount, 'شحن المحفظة (دفع إلكتروني)', 'topup', topupId);
        return { topup_id: topupId, status: 'credited', amount: topup.amount, balance: wallet.balance };
    }
    async getTopup(ownerId, topupId) {
        const topup = await this.conn.collection('wallet_topups').findOne({ id: topupId }, { projection: { _id: 0 } });
        if (!topup)
            throw new common_1.NotFoundException('topup_not_found');
        if (topup.user_id !== ownerId)
            throw new common_1.ForbiddenException('not_your_topup');
        return topup;
    }
    async transfer(senderId, ownerType, recipientQuery, amount) {
        if (amount <= 0)
            throw new common_1.BadRequestException('Amount must be positive');
        const senderWallet = await this.getOrCreateWallet(senderId, ownerType);
        if (senderWallet.balance < amount) {
            throw new common_1.BadRequestException('insufficient_balance');
        }
        const recipientUser = await this.userModel.findOne({
            $or: [
                { id: recipientQuery },
                { phone: recipientQuery },
                { email: recipientQuery },
            ],
        });
        if (!recipientUser) {
            throw new common_1.NotFoundException('recipient_user_not_found');
        }
        if (recipientUser.id === senderId) {
            throw new common_1.BadRequestException('cannot_transfer_to_self');
        }
        const recipientWallet = await this.getOrCreateWallet(recipientUser.id, recipientUser.role === 'patient' ? 'patient' : 'provider');
        const debited = await this.walletModel.updateOne({ _id: senderWallet._id, balance: { $gte: amount } }, { $inc: { balance: -amount }, $set: { updatedAt: new Date() } });
        if (!debited.modifiedCount)
            throw new common_1.BadRequestException('insufficient_balance');
        await this.walletModel.updateOne({ _id: recipientWallet._id }, { $inc: { balance: amount }, $set: { updatedAt: new Date() } });
        senderWallet.balance -= amount;
        const refId = (0, uuid_1.v4)();
        await this.txModel.create({
            walletId: senderWallet.id,
            amount,
            type: 'debit',
            referenceType: 'booking',
            referenceId: refId,
            description: `تحويل إلى ${recipientUser.full_name || recipientQuery}`,
        });
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
    async addCommissionDebt(providerId, consultationAmount) {
        const percent = await this.commissionPercent('consultation');
        const commission = consultationAmount * (percent / 100);
        const wallet = await this.getOrCreateWallet(providerId, 'provider');
        wallet.balance -= commission;
        await wallet.save();
        await this.txModel.create({
            walletId: wallet.id,
            amount: commission,
            type: 'debit',
            referenceType: 'commission',
            referenceId: (0, uuid_1.v4)(),
            description: `عمولة منصة نبض (${percent}%) - دفع بالعيادة`
        });
        const threshold = await this.debtSuspensionThreshold();
        if (wallet.balance <= -threshold) {
            await this.userModel.findOneAndUpdate({ id: providerId }, { $set: { active: false } });
        }
        return wallet;
    }
    async addInsuranceEscrow(providerId, insuranceAmount) {
        const wallet = await this.getOrCreateWallet(providerId, 'provider');
        await this.txModel.create({
            walletId: wallet.id,
            amount: insuranceAmount,
            type: 'credit',
            referenceType: 'insurance_escrow',
            referenceId: (0, uuid_1.v4)(),
            description: 'مبالغ معلقة (تأمين)'
        });
        return wallet;
    }
    async getCards(ownerId, ownerType) {
        const wallet = await this.getOrCreateWallet(ownerId, ownerType);
        return wallet.savedCards || [];
    }
    async addCard(ownerId, ownerType, cardData) {
        const wallet = await this.getOrCreateWallet(ownerId, ownerType);
        const last4 = String(cardData?.last4 || cardData?.cardNumber?.slice(-4) || '');
        if (!/^\d{4}$/.test(last4))
            throw new common_1.BadRequestException('card last4 required');
        if (!cardData?.holderName || !String(cardData.holderName).trim())
            throw new common_1.BadRequestException('card holder name required');
        if (!/^\d{2}\/\d{2}$/.test(String(cardData?.expiry || '')))
            throw new common_1.BadRequestException('card expiry (MM/YY) required');
        const newCard = {
            id: (0, uuid_1.v4)(),
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
    async removeCard(ownerId, ownerType, cardId) {
        const wallet = await this.getOrCreateWallet(ownerId, ownerType);
        wallet.savedCards = wallet.savedCards.filter((c) => c.id !== cardId);
        if (wallet.savedCards.length > 0 && !wallet.savedCards.find((c) => c.isDefault)) {
            wallet.savedCards[0].isDefault = true;
        }
        await wallet.save();
        return wallet.savedCards;
    }
    async getSpendingData(ownerId, ownerType) {
        const wallet = await this.walletModel.findOne({ ownerId, ownerType });
        if (!wallet)
            return [];
        const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);
        const rows = await this.txModel.model.aggregate([
            { $match: { walletId: wallet.id, type: 'debit', createdAt: { $gte: since } } },
            { $group: { _id: '$referenceType', total: { $sum: '$amount' } } },
        ]);
        const META = {
            booking: { category: 'حجوزات وخدمات', color: '#23B5CE' },
            commission: { category: 'عمولات المنصة', color: '#7A6BEA' },
            refund: { category: 'استردادات', color: '#F0A526' },
            referral: { category: 'إحالات', color: '#16A34A' },
            insurance_escrow: { category: 'تأمين', color: '#F0695C' },
        };
        return rows
            .filter((r) => r.total > 0)
            .map((r) => ({
            category: META[r._id]?.category || r._id || 'أخرى',
            amount: Math.round(r.total * 100) / 100,
            color: META[r._id]?.color || '#94A3B8',
        }))
            .sort((a, b) => b.amount - a.amount);
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('WalletRepository')),
    __param(1, (0, common_1.Inject)('WalletTransactionRepository')),
    __param(2, (0, common_1.Inject)('UserRepository')),
    __param(3, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository,
        wallettransaction_repository_1.WalletTransactionRepository,
        user_repository_1.UserRepository,
        mongoose_2.Connection,
        moyasar_module_1.MoyasarService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map