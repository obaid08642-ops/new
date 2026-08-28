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
exports.ProviderPayoutsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const auth_guard_1 = require("../../common/auth.guard");
const finance_engine_module_1 = require("../finance-engine/finance-engine.module");
let ProviderPayoutsController = class ProviderPayoutsController {
    constructor(conn, ledger) {
        this.conn = conn;
        this.ledger = ledger;
    }
    get withdrawals() { return this.conn.collection('providerwithdrawals'); }
    get ledgerEntries() { return this.conn.collection('platformledgerentries'); }
    assertPharmacySettlementReady(user) {
        if (String(user?.role || '').toLowerCase() === 'pharmacy') {
            throw new common_1.ServiceUnavailableException('pharmacy_settlement_proof_required');
        }
    }
    validateIban(iban) {
        if (!iban)
            throw new common_1.BadRequestException('verified_bank_account_required');
        const clean = String(iban).replace(/\s+/g, '').toUpperCase();
        if (!/^SA\d{22}$/.test(clean))
            throw new common_1.BadRequestException('invalid_verified_iban');
        return clean;
    }
    async balanceForReservation(providerId, session) {
        const rows = await this.ledgerEntries.aggregate([
            { $match: { provider_account_id: providerId } },
            { $group: { _id: null,
                    earned_cleared: { $sum: { $cond: [{ $and: [{ $in: ['$type', ['provider_earning', 'bonus', 'referral']] }, { $eq: ['$state', 'cleared'] }] }, '$amount', 0] } },
                    earned_pending: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'provider_earning'] }, { $eq: ['$state', 'pending'] }] }, '$amount', 0] } },
                    debits: { $sum: { $cond: [{ $in: ['$type', ['provider_debit', 'penalty', 'chargeback']] }, '$amount', 0] } },
                    paid: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'payout'] }, { $eq: ['$state', 'cleared'] }] }, '$amount', 0] } },
                    locked: { $sum: { $cond: [{ $eq: ['$state', 'locked'] }, '$amount', 0] } },
                } },
        ], { session }).toArray();
        const row = rows[0] || {};
        return {
            available: Math.round(((row.earned_cleared || 0) - (row.paid || 0) - (row.debits || 0) - (row.locked || 0)) * 100) / 100,
            pending: Math.round((row.earned_pending || 0) * 100) / 100,
        };
    }
    async request(user, body) {
        this.assertPharmacySettlementReady(user);
        const amount = Math.round(Number(body?.amount) * 100) / 100;
        const idempotencyKey = String(body?.idempotency_key || '').trim();
        if (!Number.isFinite(amount) || amount <= 0)
            throw new common_1.BadRequestException('valid_amount_required');
        if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey))
            throw new common_1.BadRequestException('idempotency_key_required');
        await this.withdrawals.createIndex({ provider_id: 1, idempotency_key: 1 }, {
            unique: true, partialFilterExpression: { idempotency_key: { $exists: true } },
        });
        const previous = await this.withdrawals.findOne({ provider_id: user.id, idempotency_key: idempotencyKey });
        if (previous)
            return { ok: true, idempotent: true, request: previous, reference: previous.reference };
        const bank = await this.conn.collection('provider_bank_accounts').findOne({ account_id: user.id, review_status: 'approved' });
        if (!bank)
            throw new common_1.BadRequestException('verified_bank_account_required');
        const iban = this.validateIban(bank.iban);
        const minimum = (await this.conn.collection('finance_config').findOne({ key: 'commissions' }))?.payout_schedule?.minimum_payout_sar ?? 100;
        const session = await this.conn.startSession();
        try {
            let response;
            await session.withTransaction(async () => {
                const existing = await this.withdrawals.findOne({ provider_id: user.id, idempotency_key: idempotencyKey }, { session });
                if (existing) {
                    response = { ok: true, idempotent: true, request: existing, reference: existing.reference };
                    return;
                }
                const balance = await this.balanceForReservation(user.id, session);
                if (balance.available < 0)
                    throw new common_1.BadRequestException('negative_balance');
                if (amount < minimum)
                    throw new common_1.BadRequestException(`minimum_withdrawal_${minimum}`);
                if (amount > balance.available)
                    throw new common_1.BadRequestException('insufficient_available_balance');
                const pending = await this.withdrawals.findOne({ provider_id: user.id, state: { $in: ['PENDING_ADMIN_APPROVAL', 'APPROVED_FOR_PAYOUT'] } }, { session });
                if (pending)
                    throw new common_1.BadRequestException('pending_withdrawal_exists');
                const id = `wd_${(0, uuid_1.v4)()}`;
                const now = new Date();
                const request = {
                    id, provider_id: user.id, provider_type: user.role, amount, iban, bank_name: bank.bank_name,
                    bank_account_id: String(bank._id || bank.id || ''), bank_review_status: 'approved',
                    state: 'PENDING_ADMIN_APPROVAL', reference: `PAYOUT-${id.slice(-12).toUpperCase()}`,
                    idempotency_key: idempotencyKey, balance_at_request: balance.available,
                    escrow_pending_at_request: balance.pending, reservation_state: 'locked', createdAt: now, updatedAt: now,
                };
                await this.withdrawals.insertOne(request, { session });
                await this.ledgerEntries.insertOne({
                    id: `le_${id}`, provider_account_id: user.id, type: 'payout', state: 'locked', amount,
                    ref_type: 'withdrawal_reservation', ref_id: id, description: `Withdrawal reserved ${request.reference}`,
                    actor_id: user.id, meta: { withdrawal_id: id, bank_account_id: request.bank_account_id }, createdAt: now,
                }, { session });
                response = {
                    ok: true, request, reference: request.reference,
                    available_balance: Math.round((balance.available - amount) * 100) / 100,
                    escrow_pending: balance.pending, minimum,
                };
            });
            return response;
        }
        catch (error) {
            if (error?.code === 11000) {
                const existing = await this.withdrawals.findOne({ provider_id: user.id, idempotency_key: idempotencyKey });
                if (existing)
                    return { ok: true, idempotent: true, request: existing, reference: existing.reference };
            }
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    mine(user) {
        return this.withdrawals.find({ provider_id: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
    }
    balance(user) {
        this.assertPharmacySettlementReady(user);
        return this.ledger.providerBalance(user.id);
    }
};
exports.ProviderPayoutsController = ProviderPayoutsController;
__decorate([
    (0, common_1.Post)('request'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProviderPayoutsController.prototype, "request", null);
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProviderPayoutsController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)('balance'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderPayoutsController.prototype, "balance", null);
exports.ProviderPayoutsController = ProviderPayoutsController = __decorate([
    (0, common_1.Controller)('provider/payouts'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        finance_engine_module_1.LedgerService])
], ProviderPayoutsController);
//# sourceMappingURL=provider-payouts.controller.js.map